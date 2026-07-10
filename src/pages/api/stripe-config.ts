export const prerender = false

import type { APIRoute } from 'astro'

export const GET: APIRoute = () => {
  const publishableKey = import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY

  if (!publishableKey) {
    return new Response(JSON.stringify({ error: 'Stripe is not configured.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ publishableKey }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}
