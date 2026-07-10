export const prerender = false

import type { APIRoute } from 'astro'
import { rateLimit, getClientIp } from '../../../lib/rate-limit'
import { createSessionCookie, isSessionConfigured } from '../../../lib/customer-auth'
import { hasCustomerAccount, verifyCustomerPassword } from '../../../lib/customer-store'
import { findOrdersByEmail, isOrdersNotionConfigured } from '../../../lib/notion-orders'

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request)
  if (!rateLimit(ip, { limit: 10, windowMs: 60_000 })) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!isSessionConfigured() || !isOrdersNotionConfigured()) {
    return new Response(JSON.stringify({ error: 'Customer portal is not configured.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!hasCustomerAccount(email)) {
      return new Response(
        JSON.stringify({
          error: 'No account found for that email. Access your dashboard with your checkout email first.',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const valid = await verifyCustomerPassword(email, password)
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Incorrect password.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const orders = await findOrdersByEmail(email)
    if (orders.length === 0) {
      return new Response(JSON.stringify({ error: 'No orders found for this account.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({ ok: true, redirect: '/dashboard/' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': createSessionCookie({ email, hasPassword: true }),
        },
      },
    )
  } catch (err) {
    console.error('[auth/login] Error:', err)
    return new Response(JSON.stringify({ error: 'Could not sign in. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
