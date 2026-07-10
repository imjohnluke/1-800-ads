import type { ReactNode } from 'react'

export type DashboardView = 'home' | 'new-order' | 'support'

export type CustomerInfo = {
  email: string
  hasPassword: boolean
}

const NAV_ITEMS: {
  id: DashboardView
  label: string
  href: string
  icon: ReactNode
}[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/dashboard/',
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path
          d="M3 8.5 10 3l7 5.5V17a1 1 0 0 1-1 1h-4.5v-5H8.5v5H4a1 1 0 0 1-1-1V8.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'new-order',
    label: 'New order',
    href: '/dashboard/new/',
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 4v12M4 10h12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'support',
    label: 'Support',
    href: '/dashboard/support/',
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path
          d="M4 6.5A5.5 5.5 0 0 1 15 9v4.5H5.8L4 15.5V6.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

type Props = {
  view: DashboardView
  customer: CustomerInfo
}

export default function DashboardSidebar({ view, customer }: Props) {
  async function handleLogout() {
    await fetch('/api/auth/logout/', { method: 'POST' })
    window.location.href = '/track/'
  }

  return (
    <aside className="ea-dash-sidebar">
      <a className="ea-dash-sidebar-brand" href="/dashboard/">
        <img src="/images/1-800-ads/logo-white.png" alt="1-800 Ads" width={140} height={30} />
      </a>

      <nav className="ea-dash-sidebar-nav" aria-label="Dashboard">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className={`ea-dash-sidebar-link${view === item.id ? ' is-active' : ''}`}
            aria-current={view === item.id ? 'page' : undefined}
          >
            <span className="ea-dash-sidebar-icon">{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>

      <div className="ea-dash-sidebar-footer">
        <p className="ea-dash-sidebar-email">{customer.email}</p>
        <button className="ea-dash-sidebar-signout" type="button" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </aside>
  )
}
