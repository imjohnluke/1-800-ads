import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripe() {
  const secretKey = import.meta.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY')
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2024-06-20',
    })
  }

  return stripeClient
}

export async function getCheckoutSessionDetails(sessionId: string) {
  const session = await getStripe().checkout.sessions.retrieve(sessionId)

  return {
    email:
      session.customer_details?.email ?? session.customer_email ?? undefined,
    adCount: Number(session.metadata?.adCount ?? 0),
    total: Number(session.metadata?.total ?? 0),
    deliverySchedule:
      session.metadata?.deliverySchedule === 'monthly' ? ('monthly' as const) : ('one-time' as const),
    paidAt: new Date((session.created ?? Date.now() / 1000) * 1000).toISOString(),
  }
}
