export const prerender = false

import type { APIRoute } from 'astro'
import { getSessionFromRequest } from '../../../lib/customer-auth'

export const GET: APIRoute = async ({ request }) => {
  const session = getSessionFromRequest(request)

  if (!session) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({
      authenticated: true,
      email: session.email,
      hasPassword: session.hasPassword,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}
