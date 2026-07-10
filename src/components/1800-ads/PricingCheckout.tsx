import { useState, useCallback, useEffect } from 'react'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js'
import { formatUsd, getOrderSummary, getDeliveryScheduleLabel, type DeliverySchedule } from '../../data/1800-ads-pricing'

export default function PricingCheckout() {
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [adCount, setAdCount] = useState(10)
  const [deliverySchedule, setDeliverySchedule] = useState<DeliverySchedule>('one-time')
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [stripeLoading, setStripeLoading] = useState(true)

  const order = getOrderSummary(adCount)
  const deliveryLabel = getDeliveryScheduleLabel(deliverySchedule)

  const closeCheckout = useCallback(() => {
    setCheckoutOpen(false)
    setCheckoutError(null)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadPublishableKey() {
      try {
        const res = await fetch('/api/stripe-config/')
        const data = (await res.json()) as { publishableKey?: string; error?: string }

        if (!res.ok || !data.publishableKey) {
          throw new Error(data.error || 'Stripe is not configured.')
        }

        if (!cancelled) {
          setStripePromise(loadStripe(data.publishableKey))
        }
      } catch (err) {
        if (!cancelled) {
          setCheckoutError(
            err instanceof Error ? err.message : 'Checkout is unavailable right now.',
          )
        }
      } finally {
        if (!cancelled) setStripeLoading(false)
      }
    }

    loadPublishableKey()
    document.dispatchEvent(new Event('1800-checkout-ready'))

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      if (stripeLoading) {
        setCheckoutError('Checkout is still loading. Try again in a moment.')
        setCheckoutOpen(true)
        return
      }

      if (!stripePromise) {
        setCheckoutError(checkoutError || 'Checkout is not configured. Missing Stripe publishable key.')
        setCheckoutOpen(true)
        return
      }

      const detail = (e as CustomEvent<{ adCount: number; deliverySchedule?: DeliverySchedule }>).detail
      if (detail?.adCount) setAdCount(detail.adCount)
      setDeliverySchedule(detail?.deliverySchedule ?? 'one-time')
      setCheckoutError(null)
      setCheckoutOpen(true)
    }
    document.addEventListener('open-1800-checkout', handler)
    return () => document.removeEventListener('open-1800-checkout', handler)
  }, [stripeLoading, stripePromise, checkoutError])

  useEffect(() => {
    if (!checkoutOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCheckout()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [checkoutOpen, closeCheckout])

  const fetchClientSecret = useCallback(async () => {
    if (!stripePromise) {
      throw new Error('Stripe is not configured')
    }

    const coupon = new URLSearchParams(window.location.search).get('coupon') || undefined
    let fbclid = ''
    try {
      fbclid = localStorage.getItem('cos_fbclid') || ''
    } catch {
      /* ignore */
    }

    const res = await fetch('/api/create-checkout-session/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adCount: order.adCount,
        deliverySchedule,
        coupon,
        ...(fbclid ? { fbclid } : {}),
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to create checkout session')
    return data.clientSecret
  }, [order.adCount, deliverySchedule, stripePromise])

  if (!checkoutOpen) return null

  return (
    <div className="checkout-overlay" onClick={closeCheckout}>
      <div className="checkout-card" onClick={(e) => e.stopPropagation()}>
        <div className="checkout-header">
          <div>
            <h2 className="checkout-title">1-800 Ads — {order.label}</h2>
            <p className="checkout-subtitle">
              One-time payment of {formatUsd(order.total)}
              {deliverySchedule !== 'one-time' ? ` · ${deliveryLabel} delivery` : ''}
            </p>
          </div>
          <button type="button" className="checkout-close" onClick={closeCheckout} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>
        <div className="checkout-body">
          {checkoutError ? (
            <p className="checkout-error">{checkoutError}</p>
          ) : stripePromise ? (
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          ) : (
            <p className="checkout-error">Checkout is unavailable right now. Please try again later.</p>
          )}
        </div>
      </div>

      <style>{`
        .checkout-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: checkoutFadeIn 0.3s ease-out forwards;
        }

        .checkout-overlay::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(4px);
        }

        .checkout-card {
          position: relative;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          border-radius: 16px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
          animation: checkoutScaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          display: flex;
          flex-direction: column;
        }

        .checkout-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 24px 24px 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        .checkout-title {
          font-family: var(--ea-font-display);
          font-size: 20px;
          font-weight: 700;
          color: #111827;
          margin: 0;
          line-height: 1.3;
        }

        .checkout-subtitle {
          font-family: var(--ea-font-sans, 'Inter', sans-serif);
          font-size: 14px;
          color: #6b7280;
          margin: 4px 0 0;
        }

        .checkout-close {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: #9ca3af;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
          flex-shrink: 0;
        }

        .checkout-close:hover {
          background: #f3f4f6;
          color: #4b5563;
        }

        .checkout-body {
          flex: 1;
          overflow-y: auto;
          padding: 0;
          min-height: 400px;
        }

        .checkout-error {
          margin: 0;
          padding: 24px;
          font-family: var(--ea-font-sans, 'Inter', sans-serif);
          font-size: 14px;
          line-height: 1.5;
          color: #b42318;
        }

        @keyframes checkoutFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes checkoutScaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}
