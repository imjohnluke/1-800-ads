import { defineMiddleware } from 'astro:middleware'
import { getSessionFromRequest } from './lib/customer-auth'

export const onRequest = defineMiddleware(async (context, next) => {
  const session = getSessionFromRequest(context.request)
  context.locals.customer = session

  if (context.url.pathname.startsWith('/dashboard') && !session) {
    const sessionId = context.url.searchParams.get('session_id')
    if (sessionId) {
      return context.redirect(`/track/?session_id=${encodeURIComponent(sessionId)}`)
    }

    const nextUrl = context.url.pathname + context.url.search
    return context.redirect(`/track/?next=${encodeURIComponent(nextUrl)}`)
  }

  return next()
})
