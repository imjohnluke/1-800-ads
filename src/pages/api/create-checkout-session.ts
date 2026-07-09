export const prerender = false

import type { APIRoute } from 'astro'
import { stripe } from '../../lib/stripe'
import { getOrderSummary, clampAdCount, type DeliverySchedule } from '../../data/1800-ads-pricing'
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
    const unitAmount = order.total * 100

    const validSchedules: DeliverySchedule[] = ['one-time', 'bi-weekly', 'weekly']
    const schedule: DeliverySchedule =
      count >= 20 &&
      typeof deliverySchedule === 'string' &&
      validSchedules.includes(deliverySchedule as DeliverySchedule)
        ? (deliverySchedule as DeliverySchedule)
        : 'one-time'

    const scheduleLabel =
      schedule === 'one-time' ? 'One-time delivery' : schedule === 'weekly' ? 'Weekly delivery' : 'Bi-weekly delivery'
    const includesAudit = count >= 20

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      ui_mode: 'embedded',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `1-800 Ads — ${order.label}`,
              description: `${order.adCount} conversion-focused static ads · ${scheduleLabel}${includesAudit ? ' · Free creative audit included' : ''}`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      return_url: `${getOrigin(request)}/order-success/?session_id={CHECKOUT_SESSION_ID}`,
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

    const session = await stripe.checkout.sessions.create(sessionParams)

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[create-checkout-session] Error:', err)

    let clientMessage = 'Something went wrong. Please try again.'
    const stripeErr = err as { type?: string; code?: string }
    if (stripeErr.type === 'StripeInvalidRequestError' && stripeErr.code === 'resource_missing') {
      clientMessage = 'Invalid coupon code. Please check and try again.'
    }

    return new Response(JSON.stringify({ error: clientMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
