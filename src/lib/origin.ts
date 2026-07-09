import { SITE_URL } from './site'

function allowedHosts(): string[] {
  const hosts = new Set(['localhost', '127.0.0.1'])

  try {
    hosts.add(new URL(SITE_URL).hostname)
  } catch {
    /* ignore invalid env */
  }

  return [...hosts]
}

export function getOrigin(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-host') || request.headers.get('host')

  if (forwarded) {
    const hostname = forwarded.split(':')[0]
    if (allowedHosts().includes(hostname)) {
      const proto = request.headers.get('x-forwarded-proto') || 'https'
      return `${proto}://${forwarded}`
    }
  }

  return SITE_URL.replace(/\/$/, '')
}
