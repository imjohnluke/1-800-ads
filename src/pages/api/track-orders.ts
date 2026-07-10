export const prerender = false

import type { APIRoute } from 'astro'
import { rateLimit, getClientIp } from '../../lib/rate-limit'
import { getSessionFromRequest } from '../../lib/customer-auth'
import {
  findOrderBySessionId,
  findOrdersByEmail,
  isOrdersNotionConfigured,
} from '../../lib/notion-orders'

function sanitizeOrders(orders: Awaited<ReturnType<typeof findOrdersByEmail>>) {
  return orders.map((order) => ({
    id: order.id,
    brandName: order.brandName,
    adCount: order.adCount,
    total: order.total,
    deliverySchedule: order.deliverySchedule,
    status: order.status,
    paidAt: order.paidAt,
    brandUrl: order.brandUrl,
    deliveryLink: order.deliveryLink,
    dueDate: order.dueDate,
    stripeSession: order.stripeSession,
  }))
}

export const GET: APIRoute = async ({ request, url }) => {
  const ip = getClientIp(request)
  if (!rateLimit(ip, { limit: 20, windowMs: 60_000 })) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!isOrdersNotionConfigured()) {
    return new Response(JSON.stringify({ error: 'Order tracking is not configured yet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const sessionId = url.searchParams.get('session_id')?.trim()
  const email = url.searchParams.get('email')?.trim().toLowerCase()
  const session = getSessionFromRequest(request)

  if (!sessionId && !email && !session) {
    return new Response(JSON.stringify({ error: 'Provide email or session_id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    if (sessionId) {
      const order = await findOrderBySessionId(sessionId)
      return new Response(JSON.stringify({ orders: order ? sanitizeOrders([order]) : [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const lookupEmail = session?.email ?? email
    if (!lookupEmail) {
      return new Response(JSON.stringify({ error: 'Sign in to view your orders.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (email && session && session.email !== email) {
      return new Response(JSON.stringify({ error: 'Email does not match your session.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const orders = await findOrdersByEmail(lookupEmail)
    return new Response(JSON.stringify({ orders: sanitizeOrders(orders) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[track-orders] Error:', err)
    return new Response(JSON.stringify({ error: 'Could not load orders. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request)
  if (!rateLimit(ip, { limit: 10, windowMs: 60_000 })) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!isOrdersNotionConfigured()) {
    return new Response(JSON.stringify({ error: 'Order tracking is not configured yet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
    const session = getSessionFromRequest(request)

    if (!email && !sessionId && !session) {
      return new Response(JSON.stringify({ error: 'Sign in to view your orders.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (sessionId) {
      const order = await findOrderBySessionId(sessionId)
      return new Response(JSON.stringify({ orders: order ? sanitizeOrders([order]) : [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const lookupEmail = session?.email ?? email
    if (!lookupEmail) {
      return new Response(JSON.stringify({ error: 'Sign in to view your orders.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (email && session && session.email !== email) {
      return new Response(JSON.stringify({ error: 'Email does not match your session.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const orders = await findOrdersByEmail(lookupEmail)
    return new Response(JSON.stringify({ orders: sanitizeOrders(orders) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[track-orders] Error:', err)
    return new Response(JSON.stringify({ error: 'Could not load orders. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
