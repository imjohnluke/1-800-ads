export const prerender = false

import type { APIRoute } from 'astro'
import type Stripe from 'stripe'
import { getStripe } from '../../lib/stripe'
import {
  createOrderInNotion,
  findOrderBySessionId,
  isOrdersNotionConfigured,
} from '../../lib/notion-orders'
import type { DeliverySchedule } from '../../data/1800-ads-pricing'

export const POST: APIRoute = async ({ request }) => {
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured')
    return new Response('Webhook not configured', { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing signature', { status: 400 })
  }

  let event: Stripe.Event

  try {
    const rawBody = await request.text()
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed', err)
    return new Response('Invalid signature', { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const session = event.data.object as Stripe.Checkout.Session

  if (session.metadata?.product !== '1800-ads') {
    return new Response(JSON.stringify({ received: true, skipped: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!isOrdersNotionConfigured()) {
    console.warn('[stripe-webhook] Orders Notion database not configured — skipping sync')
    return new Response(JSON.stringify({ received: true, synced: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const sessionId = session.id
  const customerEmail =
    session.customer_details?.email ?? session.customer_email ?? session.metadata?.customerEmail

  if (!customerEmail) {
    console.warn('[stripe-webhook] No customer email on session', sessionId)
    return new Response(JSON.stringify({ received: true, synced: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const existing = await findOrderBySessionId(sessionId)
    if (existing) {
      return new Response(JSON.stringify({ received: true, synced: true, duplicate: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const adCount = Number(session.metadata?.adCount ?? 0)
    const total = Number(session.metadata?.total ?? 0)
    const deliveryRaw = session.metadata?.deliverySchedule
    const deliverySchedule: DeliverySchedule =
      deliveryRaw === 'monthly' ? 'monthly' : 'one-time'

    await createOrderInNotion({
      brandName: `${adCount || 'New'} static ads`,
      customerEmail,
      stripeSession: sessionId,
      adCount: Number.isFinite(adCount) ? adCount : 0,
      total: Number.isFinite(total) ? total : 0,
      deliverySchedule,
      paidAt: new Date((session.created ?? Date.now() / 1000) * 1000).toISOString(),
    })

    return new Response(JSON.stringify({ received: true, synced: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[stripe-webhook] Failed to sync order to Notion', err)
    return new Response('Sync failed', { status: 500 })
  }
}
