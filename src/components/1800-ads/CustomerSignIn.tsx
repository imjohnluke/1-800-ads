import { useEffect, useState, type FormEvent } from 'react'

type Mode = 'access' | 'login'

type Props = {
  initialSessionId?: string
  redirectTo?: string
}

export default function CustomerSignIn({ initialSessionId, redirectTo = '/dashboard/' }: Props) {
  const [mode, setMode] = useState<Mode>('access')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(Boolean(initialSessionId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!initialSessionId) return

    async function bootstrapFromCheckout() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/auth/checkout-session/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: initialSessionId }),
        })

        const result = (await response.json()) as {
          error?: string
          redirect?: string
        }

        if (!response.ok) {
          throw new Error(result.error ?? 'Could not verify your checkout session.')
        }

        window.location.href = result.redirect ?? redirectTo
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not verify your checkout session.')
        setLoading(false)
      }
    }

    bootstrapFromCheckout()
  }, [initialSessionId, redirectTo])

  async function handleAccess(event: FormEvent) {
    event.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/access/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })

      const result = (await response.json()) as {
        error?: string
        redirect?: string
        hasPassword?: boolean
      }

      if (!response.ok) {
        if (result.hasPassword) {
          setMode('login')
        }
        throw new Error(result.error ?? 'Could not access your dashboard.')
      }

      window.location.href = result.redirect ?? redirectTo
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not access your dashboard.')
      setLoading(false)
    }
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !password) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, password }),
      })

      const result = (await response.json()) as {
        error?: string
        redirect?: string
      }

      if (!response.ok) {
        throw new Error(result.error ?? 'Could not sign in.')
      }

      window.location.href = result.redirect ?? redirectTo
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.')
      setLoading(false)
    }
  }

  return (
    <div className="ea-portal">
      <header className="ea-portal-header">
        <h1 className="ea-portal-title">Your 1-800 Ads dashboard</h1>
        <p className="ea-portal-copy">
          Access order status, briefs, and deliveries. Use the email from your Stripe checkout —
          then secure your account with a password.
        </p>
      </header>

      <div className="ea-portal-card">
        <div className="ea-portal-card-inner">
          <div className="ea-portal-tabs" role="tablist" aria-label="Sign in options">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'access'}
              className={`ea-portal-tab${mode === 'access' ? ' is-active' : ''}`}
              onClick={() => {
                setMode('access')
                setError(null)
              }}
            >
              Access with email
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={`ea-portal-tab${mode === 'login' ? ' is-active' : ''}`}
              onClick={() => {
                setMode('login')
                setError(null)
              }}
            >
              Sign in
            </button>
          </div>

          {mode === 'access' ? (
            <form className="ea-portal-form" onSubmit={handleAccess}>
              <label className="ea-portal-label" htmlFor="portal-email">
                Checkout email
              </label>
              <input
                id="portal-email"
                className="ea-portal-input"
                type="email"
                name="email"
                value={email}
                placeholder="you@company.com"
                autoComplete="email"
                disabled={loading}
                onInput={(e) => setEmail(e.currentTarget.value)}
              />
              <button className="ea-portal-btn ea-portal-btn-primary" type="submit" disabled={loading}>
                {loading ? 'Verifying…' : 'Go to dashboard'}
              </button>
              <p className="ea-portal-hint">
                We&apos;ll match this to your Stripe receipt and open your order dashboard.
              </p>
            </form>
          ) : (
            <form className="ea-portal-form" onSubmit={handleLogin}>
              <label className="ea-portal-label" htmlFor="portal-login-email">
                Email
              </label>
              <input
                id="portal-login-email"
                className="ea-portal-input"
                type="email"
                name="email"
                value={email}
                placeholder="you@company.com"
                autoComplete="email"
                disabled={loading}
                onInput={(e) => setEmail(e.currentTarget.value)}
              />
              <label className="ea-portal-label" htmlFor="portal-password">
                Password
              </label>
              <input
                id="portal-password"
                className="ea-portal-input"
                type="password"
                name="password"
                value={password}
                placeholder="Your account password"
                autoComplete="current-password"
                disabled={loading}
                onInput={(e) => setPassword(e.currentTarget.value)}
              />
              <button className="ea-portal-btn ea-portal-btn-primary" type="submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
              <p className="ea-portal-hint">
                First time here? Use <strong>Access with email</strong> to open your dashboard, then
                create a password.
              </p>
            </form>
          )}
        </div>
      </div>

      {error && <p className="ea-portal-error">{error}</p>}

      <footer className="ea-portal-footer">
        <a className="ea-portal-link" href="/#order">
          Need ads? Place an order →
        </a>
      </footer>
    </div>
  )
}
