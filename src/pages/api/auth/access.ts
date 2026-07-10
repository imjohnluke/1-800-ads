export const prerender = false

import type { APIRoute } from 'astro'
import { rateLimit, getClientIp } from '../../../lib/rate-limit'
import { createSessionCookie, isSessionConfigured } from '../../../lib/customer-auth'
import { hasCustomerAccount } from '../../../lib/customer-store'
import { findOrdersByEmail, isOrdersNotionConfigured } from '../../../lib/notion-orders'

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request)
  if (!rateLimit(ip, { limit: 10, windowMs: 60_000 })) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!isSessionConfigured()) {
    return new Response(JSON.stringify({ error: 'Customer portal is not configured.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!isOrdersNotionConfigured()) {
    return new Response(JSON.stringify({ error: 'Order tracking is not configured.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Enter a valid email address.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const orders = await findOrdersByEmail(email)
    if (orders.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No orders found for that email. Use the address from your Stripe checkout receipt.',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const hasPassword = hasCustomerAccount(email)

    return new Response(
      JSON.stringify({
        ok: true,
        redirect: '/dashboard/',
        hasPassword,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': createSessionCookie({ email, hasPassword }),
        },
      },
    )
  } catch (err) {
    console.error('[auth/access] Error:', err)
    return new Response(JSON.stringify({ error: 'Could not verify access. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
