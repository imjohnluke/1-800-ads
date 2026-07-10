export const prerender = false

import type { APIRoute } from 'astro'
import { rateLimit, getClientIp } from '../../../lib/rate-limit'
import { createSessionCookie, isSessionConfigured } from '../../../lib/customer-auth'
import { hasCustomerAccount } from '../../../lib/customer-store'
import { getCheckoutSessionDetails } from '../../../lib/stripe'
import {
  createOrderInNotion,
  findOrderBySessionId,
  isOrdersNotionConfigured,
  linkOrderStripeDetails,
} from '../../../lib/notion-orders'

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request)
  if (!rateLimit(ip, { limit: 20, windowMs: 60_000 })) {
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

  if (!import.meta.env.STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ error: 'Stripe is not configured.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await request.json()
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Missing sessionId.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const checkout = await getCheckoutSessionDetails(sessionId)
    if (!checkout.email) {
      return new Response(JSON.stringify({ error: 'Could not verify checkout session.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const existing = await findOrderBySessionId(sessionId)

    if (existing) {
      await linkOrderStripeDetails(existing.id, {
        customerEmail: checkout.email,
        stripeSession: sessionId,
      })
    } else {
      await createOrderInNotion({
        brandName: `${checkout.adCount || 'New'} static ads`,
        customerEmail: checkout.email,
        stripeSession: sessionId,
        adCount: checkout.adCount,
        total: checkout.total,
        deliverySchedule: checkout.deliverySchedule,
        paidAt: checkout.paidAt,
      })
    }

    const email = checkout.email.toLowerCase()
    const hasPassword = hasCustomerAccount(email)

    return new Response(
      JSON.stringify({ ok: true, redirect: '/dashboard/', email, hasPassword }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': createSessionCookie({ email, hasPassword }),
        },
      },
    )
  } catch (err) {
    console.error('[auth/checkout-session] Error:', err)
    return new Response(JSON.stringify({ error: 'Could not verify checkout session.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
