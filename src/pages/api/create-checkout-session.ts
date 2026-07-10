export const prerender = false

import type { APIRoute } from 'astro'
import type Stripe from 'stripe'
import { getStripe } from '../../lib/stripe'
import { getOrderSummary, clampAdCount, type DeliverySchedule } from '../../data/1800-ads-pricing'
import { STRIPE_PRICE_IDS } from '../../data/stripe-price-ids'
import { rateLimit, getClientIp } from '../../lib/rate-limit'
import { getOrigin } from '../../lib/origin'

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request)
  if (!rateLimit(ip, { limit: 10, windowMs: 60_000 })) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    if (!import.meta.env.STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Checkout is not configured on the server.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = await request.json()
    const { adCount, coupon, fbclid, deliverySchedule } = body

    if (adCount === undefined || adCount === null) {
      return new Response(JSON.stringify({ error: 'Missing adCount' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const count = clampAdCount(Number(adCount))
    if (!Number.isFinite(Number(adCount))) {
      return new Response(JSON.stringify({ error: 'Invalid adCount' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const order = getOrderSummary(count)
    const priceId = STRIPE_PRICE_IDS[count]

    if (!priceId) {
      return new Response(JSON.stringify({ error: 'Pricing is not configured for this tier.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const validSchedules: DeliverySchedule[] = ['one-time', 'monthly']
    const schedule: DeliverySchedule =
      typeof deliverySchedule === 'string' &&
      validSchedules.includes(deliverySchedule as DeliverySchedule)
        ? (deliverySchedule as DeliverySchedule)
        : 'one-time'

    const includesAudit = count >= 20

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      ui_mode: 'embedded',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      return_url: `${getOrigin(request)}/brief/?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        product: '1800-ads',
        adCount: String(order.adCount),
        pricePerAd: String(order.pricePerAd),
        total: String(order.total),
        deliverySchedule: schedule,
        freeCreativeAudit: includesAudit ? 'true' : 'false',
        ...(fbclid && typeof fbclid === 'string' ? { fbclid } : {}),
      },
    }

    if (coupon && typeof coupon === 'string') {
      sessionParams.discounts = [{ coupon }]
    }

    const session = await getStripe().checkout.sessions.create(sessionParams)

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[create-checkout-session] Error:', err)

    let clientMessage = 'Something went wrong. Please try again.'
    const stripeErr = err as { type?: string; code?: string; message?: string }
    if (!import.meta.env.STRIPE_SECRET_KEY) {
      clientMessage = 'Checkout is not configured on the server.'
    } else if (stripeErr.type === 'StripeInvalidRequestError' && stripeErr.code === 'resource_missing') {
      clientMessage = 'Invalid coupon code. Please check and try again.'
    } else if (stripeErr.type === 'StripeAuthenticationError') {
      clientMessage = 'Stripe authentication failed. Check STRIPE_SECRET_KEY in Railway.'
    }

    return new Response(JSON.stringify({ error: clientMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
