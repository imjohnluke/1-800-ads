import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  CUSTOMER_ORDER_STAGES,
  getCustomerStageIndex,
  isBriefPending,
  type OrderStatus,
} from '../../lib/order-status'
import type { DeliverySchedule } from '../../data/1800-ads-pricing'
import DashboardSidebar, { type CustomerInfo, type DashboardView } from './DashboardSidebar'

type TrackedOrder = {
  id: string
  brandName: string
  adCount: number
  total: number
  deliverySchedule: DeliverySchedule
  status: OrderStatus
  paidAt: string
  brandUrl?: string
  deliveryLink?: string
  dueDate?: string
  stripeSession: string
}

type Props = {
  initialCustomer?: CustomerInfo
  view: Extract<DashboardView, 'home' | 'support'>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function displayNameFromEmail(email: string) {
  const local = email.split('@')[0] ?? email
  const segment = local.split(/[._-]/)[0] ?? local
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function OrderProgressTrack({ status }: { status: OrderStatus }) {
  const currentIndex = getCustomerStageIndex(status)
  const stageCount = CUSTOMER_ORDER_STAGES.length

  return (
    <div className="ea-order-track">
      <div className="ea-order-segments" aria-hidden="true">
        {CUSTOMER_ORDER_STAGES.map((stage, index) => (
          <span
            key={stage}
            className={`ea-order-segment${index <= currentIndex ? ' is-filled' : ''}${index === currentIndex ? ' is-current' : ''}`}
          />
        ))}
      </div>

      <ol className="ea-order-segment-labels" aria-label="Order progress">
        {CUSTOMER_ORDER_STAGES.map((stage, index) => {
          const isComplete = index < currentIndex
          const isCurrent = index === currentIndex

          return (
            <li
              key={stage}
              className={`ea-order-segment-label${isComplete ? ' is-complete' : ''}${isCurrent ? ' is-current' : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {stage}
            </li>
          )
        })}
      </ol>

      <p className="ea-order-track-sr">
        Stage {currentIndex + 1} of {stageCount}: {CUSTOMER_ORDER_STAGES[currentIndex]}
      </p>
    </div>
  )
}

function OrderCard({ order }: { order: TrackedOrder }) {
  const briefLink = order.stripeSession
    ? `/brief/?session_id=${encodeURIComponent(order.stripeSession)}`
    : '/brief/'
  const briefPending = isBriefPending(order.status, order.brandUrl)
  const stageIndex = getCustomerStageIndex(order.status)
  const stageCount = CUSTOMER_ORDER_STAGES.length
  const packageLabel = order.adCount
    ? `${order.adCount} Ads Package`
    : 'Ads Package'
  const deliveryLabel = order.dueDate ? formatDate(order.dueDate) : 'TBD'

  return (
    <article className="ea-dash-card">
      <div className="ea-dash-card-top">
        <div className="ea-dash-card-intro">
          <h2 className="ea-dash-card-title">
            {order.brandName} — {packageLabel}
          </h2>
          <p className="ea-dash-card-meta">
            <span className="ea-dash-stage-pill">
              Stage {stageIndex + 1} of {stageCount}
            </span>
            <span className="ea-dash-card-meta-sep" aria-hidden="true">
              ·
            </span>
            <span>Estimated delivery: {deliveryLabel}</span>
          </p>
        </div>
      </div>

      <OrderProgressTrack status={order.status} />

      <div className="ea-dash-card-actions">
        {order.deliveryLink ? (
          <a
            className="ea-dash-btn ea-dash-btn-ghost"
            href={order.deliveryLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            View ads
          </a>
        ) : (
          <span className="ea-dash-btn ea-dash-btn-ghost is-disabled">View ads</span>
        )}
        {briefPending ? (
          <a className="ea-dash-btn ea-dash-btn-ghost" href={briefLink}>
            Complete brief
          </a>
        ) : (
          <a className="ea-dash-btn ea-dash-btn-ghost" href="/dashboard/support/">
            Message team
          </a>
        )}
        <a className="ea-dash-btn ea-dash-btn-ghost" href="/dashboard/support/">
          Get support
        </a>
      </div>
    </article>
  )
}

function AccountSetupCard({
  customer,
  onAccountCreated,
}: {
  customer: CustomerInfo
  onAccountCreated: () => void
}) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const result = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(result.error ?? 'Could not create account.')
      }

      setDone(true)
      onAccountCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <section className="ea-dash-account ea-dash-account-success">
        <h2 className="ea-dash-account-title">Account secured</h2>
        <p className="ea-dash-account-copy">
          You can sign in anytime with <strong>{customer.email}</strong> and your new password.
        </p>
      </section>
    )
  }

  return (
    <section className="ea-dash-account">
      <div className="ea-dash-account-head">
        <div>
          <p className="ea-dash-account-eyebrow">Secure your dashboard</p>
          <h2 className="ea-dash-account-title">Create your account</h2>
          <p className="ea-dash-account-copy">
            We already have <strong>{customer.email}</strong> from checkout. Set a password to sign
            in next time without re-entering your email.
          </p>
        </div>
      </div>

      <form className="ea-dash-account-form" onSubmit={handleSubmit}>
        <label className="ea-dash-label" htmlFor="account-password">
          Password
        </label>
        <input
          id="account-password"
          className="ea-dash-input"
          type="password"
          value={password}
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          disabled={loading}
          onInput={(e) => setPassword(e.currentTarget.value)}
        />
        <label className="ea-dash-label" htmlFor="account-confirm">
          Confirm password
        </label>
        <input
          id="account-confirm"
          className="ea-dash-input"
          type="password"
          value={confirmPassword}
          minLength={8}
          autoComplete="new-password"
          placeholder="Repeat password"
          disabled={loading}
          onInput={(e) => setConfirmPassword(e.currentTarget.value)}
        />
        {error && <p className="ea-dash-error">{error}</p>}
        <button className="ea-dash-btn ea-dash-btn-primary" type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </section>
  )
}

function QuickActions({ orders }: { orders: TrackedOrder[] }) {
  const briefOrder = orders.find((order) => isBriefPending(order.status, order.brandUrl))
  const briefHref = briefOrder?.stripeSession
    ? `/brief/?session_id=${encodeURIComponent(briefOrder.stripeSession)}`
    : '/brief/'

  const actions = [
    {
      label: 'Order new ad',
      href: '/dashboard/new/',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: briefOrder ? 'Complete brief' : 'Upload assets',
      href: briefHref,
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 16V6m0 0L8 10m4-4 4 4M5 18h14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      label: 'Get support',
      href: '/dashboard/support/',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M5 8.5A7 7 0 0 1 18 11v5.5H8.2L5 18.5V8.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  ]

  return (
    <section className="ea-dash-quick-actions" aria-label="Quick actions">
      {actions.map((action) => (
        <a key={action.label} className="ea-dash-quick-action" href={action.href}>
          <span className="ea-dash-quick-action-icon">{action.icon}</span>
          <span className="ea-dash-quick-action-label">{action.label}</span>
        </a>
      ))}
    </section>
  )
}

function HomeView({
  customer,
  orders,
  error,
  onAccountCreated,
}: {
  customer: CustomerInfo
  orders: TrackedOrder[]
  error: string | null
  onAccountCreated: () => void
}) {
  const name = displayNameFromEmail(customer.email)

  return (
    <>
      <header className="ea-dash-greeting-wrap">
        <h1 className="ea-dash-greeting">
          {getGreeting()}, {name}.
        </h1>
      </header>

      <QuickActions orders={orders} />

      {!customer.hasPassword && (
        <AccountSetupCard customer={customer} onAccountCreated={onAccountCreated} />
      )}

      {error && <p className="ea-dash-error ea-dash-error-banner">{error}</p>}

      <section className="ea-dash-orders-section">
        <h2 className="ea-dash-section-title">Current orders</h2>

        {orders.length === 0 ? (
          <div className="ea-dash-empty">
            <p>No orders yet for this account.</p>
            <a className="ea-dash-btn ea-dash-btn-primary" href="/dashboard/new/">
              Create your first order
            </a>
          </div>
        ) : (
          <div className="ea-dash-list">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function SupportView() {
  return (
    <>
      <header className="ea-dash-page-header">
        <h1 className="ea-dash-page-title">Support</h1>
        <p className="ea-dash-page-copy">Questions about your order? We&apos;re here to help.</p>
      </header>

      <section className="ea-dash-panel">
        <h2 className="ea-dash-panel-title">Contact us</h2>
        <p className="ea-dash-panel-copy">
          Email us at{' '}
          <a className="ea-dash-link" href="mailto:hello@1-800ads.com">
            hello@1-800ads.com
          </a>{' '}
          and we&apos;ll get back to you as soon as we can.
        </p>
      </section>

      <section className="ea-dash-panel">
        <h2 className="ea-dash-panel-title">FAQ</h2>
        <p className="ea-dash-panel-copy">
          Find answers to common questions on our{' '}
          <a className="ea-dash-link" href="/#faq" target="_blank" rel="noopener noreferrer">
            pricing &amp; FAQ page
          </a>
          .
        </p>
      </section>
    </>
  )
}

export default function DashboardApp({ initialCustomer, view }: Props) {
  const [customer, setCustomer] = useState<CustomerInfo | null>(initialCustomer ?? null)
  const [orders, setOrders] = useState<TrackedOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadDashboard() {
    setLoading(true)
    setError(null)

    try {
      const [meResponse, ordersResponse] = await Promise.all([
        fetch('/api/auth/me/'),
        view === 'home'
          ? fetch('/api/track-orders/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            })
          : Promise.resolve(null),
      ])

      const me = (await meResponse.json()) as {
        authenticated?: boolean
        email?: string
        hasPassword?: boolean
      }

      if (!me.authenticated || !me.email) {
        window.location.href = '/track/'
        return
      }

      setCustomer({ email: me.email, hasPassword: Boolean(me.hasPassword) })

      if (ordersResponse) {
        const ordersResult = (await ordersResponse.json()) as {
          error?: string
          orders?: TrackedOrder[]
        }

        if (!ordersResponse.ok) {
          throw new Error(ordersResult.error ?? 'Could not load orders.')
        }

        setOrders(ordersResult.orders ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [view])

  let content: ReactNode = null

  if (loading) {
    content = <p className="ea-dash-loading">Loading your dashboard…</p>
  } else if (customer) {
    if (view === 'home') {
      content = (
        <HomeView
          customer={customer}
          orders={orders}
          error={error}
          onAccountCreated={() =>
            setCustomer((prev) => (prev ? { ...prev, hasPassword: true } : prev))
          }
        />
      )
    } else {
      content = <SupportView />
    }
  }

  return (
    <div className="ea-dash-app">
      {customer && <DashboardSidebar view={view} customer={customer} />}
      <main className="ea-dash-main">{content}</main>
    </div>
  )
}
