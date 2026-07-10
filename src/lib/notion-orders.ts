import type { DeliverySchedule } from '../data/1800-ads-pricing'
import {
  normalizeOrderStatus,
  packTypeForAdCount,
  parseAdCountFromPackType,
  type OrderStatus,
} from './order-status'

const NOTION_VERSION = '2022-06-28'

export type OrderRecord = {
  id: string
  brandName: string
  customerEmail: string
  stripeSession: string
  adCount: number
  total: number
  deliverySchedule: DeliverySchedule
  status: OrderStatus
  paidAt: string
  brandUrl?: string
  deliveryLink?: string
  dueDate?: string
}

export type NewOrder = {
  brandName: string
  customerEmail: string
  stripeSession: string
  adCount: number
  total: number
  deliverySchedule: DeliverySchedule
  paidAt: string
}

export type BriefForOrder = {
  brandName: string
  brandUrl: string
  adStyles: string
  promotions: string
  sessionId?: string
  customerEmail?: string
  uploadedFiles: Array<{ name: string; size: number; type: string }>
}

type PageMeta = {
  customerEmail: string
  stripeSession: string
}

function getNotionConfig() {
  const token = import.meta.env.NOTION_API_KEY
  const databaseId =
    import.meta.env.NOTION_ORDERS_DATABASE_ID ?? import.meta.env.NOTION_BRIEF_DATABASE_ID
  return { token, databaseId }
}

export function isOrdersNotionConfigured() {
  const { token, databaseId } = getNotionConfig()
  return Boolean(token && databaseId)
}

function richText(content: string) {
  if (!content) {
    return [{ type: 'text', text: { content: '' } }]
  }

  const parts = []
  for (let i = 0; i < content.length; i += 2000) {
    parts.push({
      type: 'text',
      text: { content: content.slice(i, i + 2000) },
    })
  }
  return parts
}

function paragraphBlock(content: string) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: richText(content),
    },
  }
}

function headingBlock(content: string) {
  return {
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: richText(content),
    },
  }
}

function buildBriefBlocks(brief: BriefForOrder) {
  const uploads =
    brief.uploadedFiles.length > 0
      ? brief.uploadedFiles
          .map((file) => `${file.name} (${Math.round(file.size / 1024)} KB)`)
          .join(', ')
      : 'None — using website + generated images'

  const blocks = [
    headingBlock('Creative Brief'),
    paragraphBlock(`Stripe Session: ${brief.sessionId ?? 'Not provided'}`),
  ]

  if (brief.customerEmail) {
    blocks.push(paragraphBlock(`Customer Email: ${brief.customerEmail.toLowerCase()}`))
  }

  blocks.push(
    paragraphBlock(`Brand URL: ${brief.brandUrl}`),
    paragraphBlock(`Ad Styles: ${brief.adStyles || 'Not specified'}`),
    paragraphBlock(`Promotions: ${brief.promotions || 'Not specified'}`),
    paragraphBlock(`Uploads: ${uploads}`),
  )

  return blocks
}

function buildOrderMetaBlocks(order: NewOrder) {
  return [
    paragraphBlock(`Stripe Session: ${order.stripeSession}`),
    paragraphBlock(`Customer Email: ${order.customerEmail.toLowerCase()}`),
  ]
}

function parseMetaFromText(text: string): Partial<PageMeta> {
  const meta: Partial<PageMeta> = {}

  const emailMatch = text.match(/Customer Email:\s*(\S+@\S+\.\S+)/i)
  if (emailMatch) meta.customerEmail = emailMatch[1].toLowerCase()

  const sessionMatch = text.match(/Stripe Session:\s*(cs_[a-zA-Z0-9_]+)/i)
  if (sessionMatch) meta.stripeSession = sessionMatch[1]

  return meta
}

async function getDatabasePropertyNames() {
  const { databaseId } = getNotionConfig()
  if (!databaseId) return new Set<string>()

  const data = (await notionFetch(`/databases/${databaseId}`, {
    method: 'GET',
  })) as { properties?: Record<string, unknown> }

  return new Set(Object.keys(data.properties ?? {}))
}

function applyOptionalProperties(
  properties: Record<string, unknown>,
  names: Set<string>,
  values: { customerEmail?: string; stripeSession?: string },
) {
  if (values.customerEmail && names.has('Customer Email')) {
    properties['Customer Email'] = { email: values.customerEmail.toLowerCase() }
  }

  if (values.stripeSession && names.has('Stripe Session')) {
    properties['Stripe Session'] = { rich_text: richText(values.stripeSession) }
  }
}

function readPlainText(property: { rich_text?: Array<{ plain_text?: string }> } | undefined) {
  return property?.rich_text?.map((part) => part.plain_text ?? '').join('') ?? ''
}

function readEmail(property: { email?: string | null } | undefined) {
  return property?.email ?? ''
}

async function notionFetch(path: string, init: RequestInit) {
  const { token } = getNotionConfig()
  if (!token) {
    throw new Error('Notion is not configured')
  }

  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('[notion-orders] request failed', response.status, errorBody)
    throw new Error('Notion request failed')
  }

  return response.json()
}

function readTitle(property: { title?: Array<{ plain_text?: string }> } | undefined) {
  return property?.title?.map((part) => part.plain_text ?? '').join('') ?? ''
}

function readSelect(property: { select?: { name?: string } | null } | undefined) {
  return property?.select?.name ?? ''
}

function readUrl(property: { url?: string | null } | undefined) {
  return property?.url ?? undefined
}

function readDate(property: { date?: { start?: string } | null } | undefined) {
  return property?.date?.start ?? undefined
}

function parseOrderPage(
  page: {
    id: string
    created_time?: string
    properties: Record<string, unknown>
  },
  meta: PageMeta = { customerEmail: '', stripeSession: '' },
): OrderRecord {
  const props = page.properties as Record<
    string,
    | { title?: Array<{ plain_text?: string }> }
    | { rich_text?: Array<{ plain_text?: string }> }
    | { select?: { name?: string } | null }
    | { email?: string | null }
    | { url?: string | null }
    | { date?: { start?: string } | null }
  >

  const packType = readSelect(props['Pack Type'])

  return {
    id: page.id,
    brandName: readTitle(props.Name),
    customerEmail: readEmail(props['Customer Email']) || meta.customerEmail,
    stripeSession: readPlainText(props['Stripe Session']) || meta.stripeSession,
    adCount: parseAdCountFromPackType(packType),
    total: 0,
    deliverySchedule: 'one-time',
    status: normalizeOrderStatus(readSelect(props.Status)),
    paidAt: readDate(props['Due Date']) ?? page.created_time ?? new Date().toISOString(),
    brandUrl: readUrl(props['Brand Link']),
    deliveryLink: readUrl(props['Delivery Link']),
    dueDate: readDate(props['Due Date']),
  }
}

async function getPageMeta(pageId: string): Promise<PageMeta> {
  const meta: PageMeta = { customerEmail: '', stripeSession: '' }

  const data = (await notionFetch(`/blocks/${pageId}/children`, {
    method: 'GET',
  })) as {
    results: Array<{
      type: string
      paragraph?: { rich_text?: Array<{ plain_text?: string }> }
      heading_2?: { rich_text?: Array<{ plain_text?: string }> }
    }>
  }

  for (const block of data.results) {
    const text =
      block.paragraph?.rich_text?.map((part) => part.plain_text ?? '').join('') ??
      block.heading_2?.rich_text?.map((part) => part.plain_text ?? '').join('') ??
      ''

    const parsed = parseMetaFromText(text)
    if (parsed.customerEmail) meta.customerEmail = parsed.customerEmail
    if (parsed.stripeSession) meta.stripeSession = parsed.stripeSession
  }

  return meta
}

async function listRecentOrderPages(limit = 50) {
  const { databaseId } = getNotionConfig()
  if (!databaseId) return []

  const data = (await notionFetch(`/databases/${databaseId}/query`, {
    method: 'POST',
    body: JSON.stringify({
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      page_size: limit,
    }),
  })) as {
    results: Array<{
      id: string
      created_time?: string
      properties: Record<string, unknown>
    }>
  }

  return data.results
}

async function listOrdersWithMeta(limit = 50) {
  const pages = await listRecentOrderPages(limit)

  return Promise.all(
    pages.map(async (page) => ({
      page,
      meta: await getPageMeta(page.id),
    })),
  )
}

export async function createOrderInNotion(order: NewOrder) {
  const { databaseId } = getNotionConfig()
  if (!databaseId) {
    throw new Error('Notion orders database is not configured')
  }

  const propertyNames = await getDatabasePropertyNames()
  const properties: Record<string, unknown> = {
    Name: {
      title: [{ type: 'text', text: { content: order.brandName.slice(0, 2000) } }],
    },
    'Pack Type': {
      select: { name: packTypeForAdCount(order.adCount) },
    },
    Status: {
      select: { name: 'New Order' },
    },
    'Due Date': {
      date: { start: order.paidAt.slice(0, 10) },
    },
  }

  applyOptionalProperties(properties, propertyNames, {
    customerEmail: order.customerEmail,
    stripeSession: order.stripeSession,
  })

  return notionFetch('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
      children: buildOrderMetaBlocks(order),
    }),
  })
}

export async function findOrderBySessionId(sessionId: string): Promise<OrderRecord | null> {
  const propertyNames = await getDatabasePropertyNames()

  if (propertyNames.has('Stripe Session')) {
    try {
      const { databaseId } = getNotionConfig()
      if (databaseId) {
        const data = (await notionFetch(`/databases/${databaseId}/query`, {
          method: 'POST',
          body: JSON.stringify({
            filter: {
              property: 'Stripe Session',
              rich_text: { equals: sessionId },
            },
            page_size: 1,
          }),
        })) as { results: Array<{ id: string; created_time?: string; properties: Record<string, unknown> }> }

        const page = data.results[0]
        if (page) {
          const meta = await getPageMeta(page.id)
          return parseOrderPage(page, meta)
        }
      }
    } catch {
      /* fall back to block scan */
    }
  }

  const entries = await listOrdersWithMeta(100)
  const match = entries.find((entry) => entry.meta.stripeSession === sessionId)
  return match ? parseOrderPage(match.page, match.meta) : null
}

export async function findOrdersByEmail(email: string): Promise<OrderRecord[]> {
  const normalized = email.trim().toLowerCase()
  const propertyNames = await getDatabasePropertyNames()

  if (propertyNames.has('Customer Email')) {
    try {
      const { databaseId } = getNotionConfig()
      if (databaseId) {
        const data = (await notionFetch(`/databases/${databaseId}/query`, {
          method: 'POST',
          body: JSON.stringify({
            filter: {
              property: 'Customer Email',
              email: { equals: normalized },
            },
            sorts: [{ timestamp: 'created_time', direction: 'descending' }],
            page_size: 20,
          }),
        })) as { results: Array<{ id: string; created_time?: string; properties: Record<string, unknown> }> }

        if (data.results.length > 0) {
          return Promise.all(
            data.results.map(async (page) => {
              const meta = await getPageMeta(page.id)
              return parseOrderPage(page, meta)
            }),
          )
        }
      }
    } catch {
      /* fall back to block scan */
    }
  }

  const entries = await listOrdersWithMeta(100)

  return entries
    .filter((entry) => entry.meta.customerEmail === normalized)
    .map((entry) => parseOrderPage(entry.page, entry.meta))
}

export async function updateOrderInNotion(
  pageId: string,
  updates: {
    brandName?: string
    brandUrl?: string
    status?: OrderStatus
  },
) {
  const properties: Record<string, unknown> = {}

  if (updates.brandName) {
    properties.Name = {
      title: [{ type: 'text', text: { content: updates.brandName.slice(0, 2000) } }],
    }
  }

  if (updates.brandUrl) {
    properties['Brand Link'] = { url: updates.brandUrl }
  }

  if (updates.status) {
    properties.Status = { select: { name: updates.status } }
  }

  return notionFetch(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties }),
  })
}

async function appendBriefBlocks(pageId: string, brief: BriefForOrder) {
  return notionFetch(`/blocks/${pageId}/children`, {
    method: 'PATCH',
    body: JSON.stringify({
      children: buildBriefBlocks(brief),
    }),
  })
}

export async function linkOrderStripeDetails(
  pageId: string,
  details: { customerEmail?: string; stripeSession?: string },
) {
  const propertyNames = await getDatabasePropertyNames()
  const properties: Record<string, unknown> = {}
  applyOptionalProperties(properties, propertyNames, {
    customerEmail: details.customerEmail,
    stripeSession: details.stripeSession,
  })

  if (Object.keys(properties).length > 0) {
    await notionFetch(`/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties }),
    })
  }

  if (details.customerEmail) {
    await ensureEmailOnPage(pageId, details.customerEmail)
  }
}

async function findOrderByBrandName(brandName: string): Promise<OrderRecord | null> {
  const normalized = brandName.trim().toLowerCase()
  const entries = await listOrdersWithMeta(50)

  const match = entries.find((entry) => {
    const props = entry.page.properties as Record<
      string,
      | { title?: Array<{ plain_text?: string }> }
      | { email?: string | null }
    >
    const name = readTitle(props.Name).toLowerCase()
    const email = readEmail(props['Customer Email']) || entry.meta.customerEmail
    return name === normalized && !email
  })

  return match ? parseOrderPage(match.page, match.meta) : null
}

async function ensureEmailOnPage(pageId: string, customerEmail: string) {
  const meta = await getPageMeta(pageId)
  if (meta.customerEmail) return

  return notionFetch(`/blocks/${pageId}/children`, {
    method: 'PATCH',
    body: JSON.stringify({
      children: [paragraphBlock(`Customer Email: ${customerEmail.toLowerCase()}`)],
    }),
  })
}

export async function saveBriefToOrderTracker(brief: BriefForOrder) {
  let existing = brief.sessionId ? await findOrderBySessionId(brief.sessionId) : null

  if (!existing && brief.brandName) {
    existing = await findOrderByBrandName(brief.brandName)
  }

  if (existing) {
    await updateOrderInNotion(existing.id, {
      brandName: brief.brandName,
      brandUrl: brief.brandUrl,
    })

    const propertyNames = await getDatabasePropertyNames()
    const linkProperties: Record<string, unknown> = {}
    applyOptionalProperties(linkProperties, propertyNames, {
      customerEmail: brief.customerEmail,
      stripeSession: brief.sessionId ?? existing.stripeSession,
    })

    if (Object.keys(linkProperties).length > 0) {
      await notionFetch(`/pages/${existing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ properties: linkProperties }),
      })
    }

    if (brief.customerEmail) {
      await ensureEmailOnPage(existing.id, brief.customerEmail)
    }

    await appendBriefBlocks(existing.id, brief)
    return existing.id
  }

  const page = (await notionFetch('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: getNotionConfig().databaseId },
      properties: await (async () => {
        const propertyNames = await getDatabasePropertyNames()
        const properties: Record<string, unknown> = {
          Name: {
            title: [{ type: 'text', text: { content: brief.brandName.slice(0, 2000) } }],
          },
          'Brand Link': {
            url: brief.brandUrl,
          },
          Status: {
            select: { name: 'New Order' },
          },
          'Due Date': {
            date: { start: new Date().toISOString().slice(0, 10) },
          },
        }

        applyOptionalProperties(properties, propertyNames, {
          customerEmail: brief.customerEmail,
          stripeSession: brief.sessionId,
        })

        return properties
      })(),
      children: buildBriefBlocks(brief),
    }),
  })) as { id: string }

  return page.id
}

export async function markBriefReceived(sessionId: string, brandName: string, brandUrl: string) {
  return saveBriefToOrderTracker({
    brandName,
    brandUrl,
    adStyles: '',
    promotions: '',
    sessionId,
    uploadedFiles: [],
  })
}
