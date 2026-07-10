export const prerender = false

import type { APIRoute } from 'astro'
import { rateLimit, getClientIp } from '../../../lib/rate-limit'
import {
  createSessionCookie,
  getSessionFromRequest,
  isSessionConfigured,
} from '../../../lib/customer-auth'
import { createCustomerAccount, hasCustomerAccount } from '../../../lib/customer-store'

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request)
  if (!rateLimit(ip, { limit: 5, windowMs: 60_000 })) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!isSessionConfigured()) {
    return new Response(JSON.stringify({ error: 'Customer portal is not configured.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const session = getSessionFromRequest(request)
  if (!session) {
    return new Response(JSON.stringify({ error: 'Sign in with your checkout email first.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (session.hasPassword || hasCustomerAccount(session.email)) {
    return new Response(JSON.stringify({ error: 'Account already exists for this email.' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await request.json()
    const password = typeof body.password === 'string' ? body.password : ''

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await createCustomerAccount(session.email, password)

    return new Response(
      JSON.stringify({ ok: true }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': createSessionCookie({ email: session.email, hasPassword: true }),
        },
      },
    )
  } catch (err) {
    console.error('[auth/register] Error:', err)
    return new Response(JSON.stringify({ error: 'Could not create account. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
