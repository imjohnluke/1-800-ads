export const prerender = false

import type { APIRoute } from 'astro'
import { rateLimit, getClientIp } from '../../lib/rate-limit'
import { getCheckoutSessionDetails } from '../../lib/stripe'
import {
  createOrderInNotion,
  findOrderBySessionId,
  isOrdersNotionConfigured,
  linkOrderStripeDetails,
  saveBriefToOrderTracker,
} from '../../lib/notion-orders'

const MAX_FILE_BYTES = 25 * 1024 * 1024
const MAX_TOTAL_BYTES = 100 * 1024 * 1024

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request)
  if (!rateLimit(ip, { limit: 5, windowMs: 60_000 })) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const form = await request.formData()

    const brandName = String(form.get('brandName') ?? '').trim()
    const brandUrl = String(form.get('brandUrl') ?? '').trim()
    const adStyles = String(form.get('adStyles') ?? '').trim()
    const promotions = String(form.get('promotions') ?? '').trim()
    const sessionId = String(form.get('sessionId') ?? '').trim() || undefined
    const formEmail = String(form.get('customerEmail') ?? '').trim() || undefined

    if (!brandName) {
      return new Response(JSON.stringify({ error: 'Brand name is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!brandUrl) {
      return new Response(JSON.stringify({ error: 'Brand URL is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      new URL(brandUrl)
    } catch {
      return new Response(JSON.stringify({ error: 'Enter a valid brand URL.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const uploads = form.getAll('contentFolders').filter((entry): entry is File => entry instanceof File)
    let totalBytes = 0

    for (const file of uploads) {
      if (file.size === 0) continue
      if (file.size > MAX_FILE_BYTES) {
        return new Response(JSON.stringify({ error: `${file.name} exceeds the 25 MB file limit.` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      totalBytes += file.size
    }

    if (totalBytes > MAX_TOTAL_BYTES) {
      return new Response(JSON.stringify({ error: 'Total upload size exceeds 100 MB.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let customerEmail = formEmail

    if (sessionId && import.meta.env.STRIPE_SECRET_KEY) {
      try {
        const checkout = await getCheckoutSessionDetails(sessionId)
        customerEmail = checkout.email ?? customerEmail

        if (isOrdersNotionConfigured() && customerEmail) {
          const existing = await findOrderBySessionId(sessionId)
          if (!existing) {
            await createOrderInNotion({
              brandName: `${checkout.adCount || 'New'} static ads`,
              customerEmail,
              stripeSession: sessionId,
              adCount: checkout.adCount,
              total: checkout.total,
              deliverySchedule: checkout.deliverySchedule,
              paidAt: checkout.paidAt,
            })
          } else {
            await linkOrderStripeDetails(existing.id, {
              customerEmail,
              stripeSession: sessionId,
            })
          }
        }
      } catch (err) {
        console.warn('[submit-brief] Could not load Stripe session', sessionId, err)
      }
    }

    const payload = {
      brandName,
      brandUrl,
      adStyles,
      promotions,
      sessionId,
      customerEmail,
      uploadedFiles: uploads
        .filter((file) => file.size > 0)
        .map((file) => ({ name: file.name, size: file.size, type: file.type || 'application/octet-stream' })),
    }

    if (isOrdersNotionConfigured()) {
      await saveBriefToOrderTracker(payload)
    } else {
      console.warn('[submit-brief] Notion not configured — logging submission only')
      console.info('[submit-brief]', JSON.stringify(payload))
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[submit-brief] Error:', err)
    return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
