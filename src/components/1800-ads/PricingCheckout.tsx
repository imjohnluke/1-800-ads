import { useEffect, useState } from 'react'
import type { DeliverySchedule } from '../../data/1800-ads-pricing'

export default function PricingCheckout() {
  const [redirecting, setRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.dispatchEvent(new Event('1800-checkout-ready'))

    const handler = async (e: Event) => {
      const detail = (e as CustomEvent<{ adCount: number; deliverySchedule?: DeliverySchedule }>).detail
      if (!detail?.adCount) return

      setRedirecting(true)
      setError(null)

      const coupon = new URLSearchParams(window.location.search).get('coupon') || undefined
      const returnTo = window.location.pathname.startsWith('/dashboard')
        ? window.location.pathname
        : undefined
      let fbclid = ''
      try {
        fbclid = localStorage.getItem('cos_fbclid') || ''
      } catch {
        /* ignore */
      }

      const endpoints = ['/api/create-checkout-session/', '/api/create-checkout-session']
      let lastError = 'Failed to start checkout'

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              adCount: detail.adCount,
              deliverySchedule: detail.deliverySchedule ?? 'one-time',
              coupon,
              returnTo,
              ...(fbclid ? { fbclid } : {}),
            }),
          })

          const data = (await res.json()) as { url?: string; error?: string }
          if (res.ok && data.url) {
            window.location.href = data.url
            return
          }

          lastError = data.error || lastError
        } catch {
          /* try next endpoint */
        }
      }

      setRedirecting(false)
      setError(lastError)
    }

    document.addEventListener('open-1800-checkout', handler)
    return () => document.removeEventListener('open-1800-checkout', handler)
  }, [])

  if (!redirecting && !error) return null

  return (
    <div className="ea-checkout-status" role="status" aria-live="polite">
      {redirecting && <p>Redirecting to secure checkout…</p>}
      {error && (
        <div className="ea-checkout-status-inner">
          <p>{error}</p>
          <button type="button" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <style>{`
        .ea-checkout-status {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(255, 248, 240, 0.92);
          backdrop-filter: blur(6px);
        }

        .ea-checkout-status p {
          margin: 0;
          font-family: var(--ea-font-sans, 'Inter', sans-serif);
          font-size: 1rem;
          font-weight: 600;
          color: var(--brand-ink, #2a0810);
          text-align: center;
        }

        .ea-checkout-status-inner {
          display: grid;
          gap: 12px;
          justify-items: center;
          max-width: 24rem;
        }

        .ea-checkout-status-inner p {
          color: #b42318;
          font-weight: 500;
          line-height: 1.5;
        }

        .ea-checkout-status-inner button {
          min-height: 40px;
          padding: 0 18px;
          border: 0;
          border-radius: 999px;
          background: var(--brand-red, #c8102e);
          color: #fff;
          font-family: var(--ea-font-sans, 'Inter', sans-serif);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}
