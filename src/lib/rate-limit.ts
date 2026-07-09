const hits = new Map<string, { count: number; reset: number }>()

export function rateLimit(
  ip: string,
  { limit = 5, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {},
): boolean {
  const now = Date.now()
  const entry = hits.get(ip)

  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + windowMs })
    return true
  }

  entry.count++
  return entry.count <= limit
}

export function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}
