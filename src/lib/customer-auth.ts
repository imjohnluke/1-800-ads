import { createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'ea_customer_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 30

export type CustomerSession = {
  email: string
  hasPassword: boolean
}

type SignedSession = CustomerSession & { exp: number }

function getSessionSecret() {
  const secret = import.meta.env.SESSION_SECRET
  if (secret) return secret
  if (import.meta.env.DEV) return 'dev-only-session-secret'
  return ''
}

export function isSessionConfigured() {
  return Boolean(getSessionSecret())
}

function signPayload(payload: SignedSession) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const secret = getSessionSecret()
  if (!secret) throw new Error('SESSION_SECRET is not configured')

  const signature = createHmac('sha256', secret).update(data).digest('base64url')
  return `${data}.${signature}`
}

function verifyPayload(token: string): SignedSession | null {
  const [data, signature] = token.split('.')
  if (!data || !signature) return null

  const secret = getSessionSecret()
  if (!secret) return null

  const expected = createHmac('sha256', secret).update(data).digest('base64url')

  try {
    const sigBuf = Buffer.from(signature)
    const expBuf = Buffer.from(expected)
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null
  } catch {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as SignedSession
    if (!payload.email || typeof payload.exp !== 'number') return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export function createSessionCookie(session: CustomerSession) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE
  const token = signPayload({ ...session, exp })
  const secure = import.meta.env.PROD ? '; Secure' : ''

  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

export function getSessionFromCookieHeader(cookieHeader: string | null): CustomerSession | null {
  if (!cookieHeader) return null

  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))
  if (!match?.[1]) return null

  const payload = verifyPayload(match[1])
  if (!payload) return null

  return {
    email: payload.email.toLowerCase(),
    hasPassword: Boolean(payload.hasPassword),
  }
}

export function getSessionFromRequest(request: Request): CustomerSession | null {
  return getSessionFromCookieHeader(request.headers.get('cookie'))
}
