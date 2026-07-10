export const prerender = false

import type { APIRoute } from 'astro'
import { rateLimit, getClientIp } from '../../lib/rate-limit'
import { getCheckoutSessionDetails } from '../../lib/stripe'
import {
  createOrderInNotion,
  findOrderBySessionId,
  isOrdersNotionConfigured,
  linkOrderStripeDetails,
} from '../../lib/notion-orders'

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request)
  if (!rateLimit(ip, { limit: 20, windowMs: 60_000 })) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
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
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Missing sessionId.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!import.meta.env.STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Stripe is not configured.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const checkout = await getCheckoutSessionDetails(sessionId)
    if (!checkout.email) {
      return new Response(JSON.stringify({ synced: false, reason: 'no_email' }), {
        status: 200,
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

    return new Response(JSON.stringify({ synced: true, email: checkout.email }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[sync-order] Error:', err)
    return new Response(JSON.stringify({ error: 'Could not sync order.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
