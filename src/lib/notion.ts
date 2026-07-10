const NOTION_VERSION = '2022-06-28'

export type BriefSubmission = {
  brandName: string
  brandUrl: string
  adStyles: string
  promotions: string
  sessionId?: string
  uploadedFiles: Array<{ name: string; size: number; type: string }>
  submittedAt: string
}

export function isNotionConfigured() {
  return Boolean(import.meta.env.NOTION_API_KEY && import.meta.env.NOTION_BRIEF_DATABASE_ID)
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

function formatUploads(files: BriefSubmission['uploadedFiles']) {
  if (files.length === 0) return 'None — using website + generated images'

  return files
    .map((file) => `${file.name} (${Math.round(file.size / 1024)} KB, ${file.type})`)
    .join('\n')
}

export async function saveBriefToNotion(brief: BriefSubmission) {
  const token = import.meta.env.NOTION_API_KEY
  const databaseId = import.meta.env.NOTION_BRIEF_DATABASE_ID

  if (!token || !databaseId) {
    throw new Error('Notion is not configured')
  }

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        Brand: {
          title: [{ type: 'text', text: { content: brief.brandName.slice(0, 2000) } }],
        },
        'Brand URL': {
          url: brief.brandUrl,
        },
        'Ad Styles': {
          rich_text: richText(brief.adStyles),
        },
        Promotions: {
          rich_text: richText(brief.promotions),
        },
        'Stripe Session': {
          rich_text: richText(brief.sessionId ?? ''),
        },
        Uploads: {
          rich_text: richText(formatUploads(brief.uploadedFiles)),
        },
        Submitted: {
          date: { start: brief.submittedAt },
        },
      },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('[notion] create page failed', response.status, errorBody)
    throw new Error('Failed to save brief to Notion')
  }

  return response.json()
}
