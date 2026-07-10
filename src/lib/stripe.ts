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
