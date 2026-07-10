import { useEffect, useMemo, useState, type FormEvent } from 'react'

function resolveSessionId(initial?: string) {
  if (typeof window !== 'undefined') {
    const fromUrl = new URLSearchParams(window.location.search).get('session_id')?.trim()
    if (fromUrl) {
      try {
        sessionStorage.setItem('ea-checkout-session-id', fromUrl)
      } catch {
        /* ignore */
      }
      return fromUrl
    }
  }

  if (initial) {
    try {
      sessionStorage.setItem('ea-checkout-session-id', initial)
    } catch {
      /* ignore */
    }
    return initial
  }

  try {
    return sessionStorage.getItem('ea-checkout-session-id') || undefined
  } catch {
    return undefined
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

type BriefData = {
  brandName: string
  brandUrl: string
  adStyles: string
  promotions: string
}

const STEPS = [
  {
    id: 'brandName',
    label: 'Brand name',
    title: "What's your brand name?",
    hint: 'The name we should use on your ads.',
    type: 'text' as const,
    placeholder: 'e.g. MAD Coffee',
    required: true,
  },
  {
    id: 'brandUrl',
    label: 'Brand URL',
    title: "What's your website?",
    hint: "We'll pull product and brand context from here if you don't upload folders.",
    type: 'url' as const,
    placeholder: 'https://yourbrand.com',
    required: true,
  },
  {
    id: 'contentFolders',
    label: 'Content folders',
    title: 'Any content folders to upload?',
    hint: "Optional — otherwise we'll use what's on your website and generate images.",
    type: 'upload' as const,
    required: false,
  },
  {
    id: 'adStyles',
    label: 'Ad styles',
    title: 'Any specific ad styles you want produced?',
    hint: 'Share references, moods, formats, or examples you like.',
    type: 'textarea' as const,
    placeholder: 'e.g. Clean product shots, bold promo tiles, UGC-style statics…',
    required: false,
  },
  {
    id: 'promotions',
    label: 'Promotions',
    title: 'Any promotions or offers to focus on?',
    hint: 'Discounts, launches, bundles, seasonal pushes — anything we should lead with.',
    type: 'textarea' as const,
    placeholder: 'e.g. 20% off first order, free shipping over $50…',
    required: false,
  },
]

function isValidUrl(value: string) {
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`)
    return Boolean(url.hostname)
  } catch {
    return false
  }
}

function normalizeUrl(value: string) {
  return value.includes('://') ? value : `https://${value}`
}

type Props = {
  sessionId?: string
}

export default function BriefForm({ sessionId: initialSessionId }: Props) {
  const [sessionId] = useState(() => resolveSessionId(initialSessionId))
  const [customerEmail, setCustomerEmail] = useState('')
  const [step, setStep] = useState(0)
  const [data, setData] = useState<BriefData>({
    brandName: '',
    brandUrl: '',
    adStyles: '',
    promotions: '',
  })
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!sessionId) return

    fetch('/api/sync-order/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {})
  }, [sessionId])

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const canContinue = useMemo(() => {
    if (current.id === 'brandName') return data.brandName.trim().length > 0
    if (current.id === 'brandUrl') return isValidUrl(data.brandUrl.trim())
    if (isLast && !sessionId) return isValidEmail(customerEmail)
    return true
  }, [current.id, data.brandName, data.brandUrl, isLast, sessionId, customerEmail])

  function updateField(id: keyof BriefData, value: string) {
    setData((prev) => ({ ...prev, [id]: value }))
    setError(null)
  }

  function handleFiles(next: FileList | null) {
    if (!next) return
    setFiles(Array.from(next))
    setError(null)
  }

  function goBack() {
    setError(null)
    setStep((prev) => Math.max(0, prev - 1))
  }

  function goNext() {
    if (!canContinue) return
    setError(null)
    setStep((prev) => Math.min(STEPS.length - 1, prev + 1))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canContinue) return

    setSubmitting(true)
    setError(null)

    try {
      const body = new FormData()
      body.set('brandName', data.brandName.trim())
      body.set('brandUrl', normalizeUrl(data.brandUrl.trim()))
      body.set('adStyles', data.adStyles.trim())
      body.set('promotions', data.promotions.trim())
      if (sessionId) body.set('sessionId', sessionId)
      if (!sessionId && customerEmail) body.set('customerEmail', customerEmail.trim())
      files.forEach((file) => body.append('contentFolders', file))

      const response = await fetch('/api/submit-brief/', {
        method: 'POST',
        body,
      })

      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(result.error ?? 'Something went wrong. Please try again.')
      }

      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="ea-brief-success">
        <p className="ea-brief-eyebrow">Brief received</p>
        <h1 className="ea-brief-success-title">You&apos;re all set — we&apos;ll start on your ads.</h1>
        <p className="ea-brief-success-copy">
          Our team has your brief for <strong>{data.brandName}</strong>. Expect your static ads in
          under 24 hours.
        </p>
        <a
          className="ea-brief-btn ea-brief-btn-primary"
          href={sessionId ? `/track/?session_id=${encodeURIComponent(sessionId)}` : '/track/'}
        >
          Track your order
        </a>
        <a className="ea-brief-btn ea-brief-btn-ghost" href="/">
          Back to 1-800 Ads
        </a>
      </div>
    )
  }

  return (
    <form className="ea-brief-form" onSubmit={isLast ? handleSubmit : (event) => event.preventDefault()}>
      <div className="ea-brief-progress" aria-hidden="true">
        {STEPS.map((item, index) => (
          <span
            key={item.id}
            className={`ea-brief-progress-dot${index <= step ? ' is-active' : ''}${index < step ? ' is-complete' : ''}`}
          />
        ))}
      </div>

      <p className="ea-brief-step-label">
        Step {step + 1} of {STEPS.length}
      </p>

      <div className="ea-brief-step" key={current.id}>
        <h1 className="ea-brief-title">{current.title}</h1>
        <p className="ea-brief-hint">{current.hint}</p>

        {current.type === 'text' && (
          <input
            className="ea-brief-input"
            type="text"
            name="brandName"
            value={data.brandName}
            placeholder={current.placeholder}
            autoFocus
            onInput={(e) => updateField('brandName', e.currentTarget.value)}
          />
        )}

        {current.type === 'url' && (
          <input
            className="ea-brief-input"
            type="url"
            name="brandUrl"
            value={data.brandUrl}
            placeholder={current.placeholder}
            autoFocus
            onInput={(e) => updateField('brandUrl', e.currentTarget.value)}
          />
        )}

        {current.type === 'upload' && (
          <div className="ea-brief-upload">
            <label className="ea-brief-upload-zone">
              <input
                className="ea-brief-upload-input"
                type="file"
                name="contentFolders"
                multiple
                accept=".zip,.pdf,image/*,video/*"
                onChange={(e) => handleFiles(e.currentTarget.files)}
              />
              <span className="ea-brief-upload-title">Drop files here or click to upload</span>
              <span className="ea-brief-upload-sub">ZIP, PDF, images, or video folders</span>
            </label>
            {files.length > 0 && (
              <ul className="ea-brief-file-list">
                {files.map((file) => (
                  <li key={`${file.name}-${file.size}`}>{file.name}</li>
                ))}
              </ul>
            )}
            <button type="button" className="ea-brief-skip" onClick={goNext}>
              Skip — use my website instead
            </button>
          </div>
        )}

        {current.type === 'textarea' && current.id === 'adStyles' && (
          <textarea
            className="ea-brief-textarea"
            name="adStyles"
            value={data.adStyles}
            placeholder={current.placeholder}
            rows={5}
            autoFocus
            onInput={(e) => updateField('adStyles', e.currentTarget.value)}
          />
        )}

        {current.type === 'textarea' && current.id === 'promotions' && (
          <>
            <textarea
              className="ea-brief-textarea"
              name="promotions"
              value={data.promotions}
              placeholder={current.placeholder}
              rows={5}
              autoFocus
              onInput={(e) => updateField('promotions', e.currentTarget.value)}
            />
            {!sessionId && (
              <label className="ea-brief-email-field">
                <span className="ea-brief-email-label">Email used at checkout</span>
                <input
                  className="ea-brief-input"
                  type="email"
                  name="customerEmail"
                  value={customerEmail}
                  placeholder="you@company.com"
                  autoComplete="email"
                  onInput={(e) => {
                    setCustomerEmail(e.currentTarget.value)
                    setError(null)
                  }}
                />
              </label>
            )}
          </>
        )}
      </div>

      {error && <p className="ea-brief-error">{error}</p>}

      <div className="ea-brief-actions">
        {isLast ? (
          <button
            type="submit"
            className="ea-brief-btn ea-brief-btn-primary"
            disabled={submitting || !canContinue}
          >
            {submitting ? 'Submitting…' : 'Submit brief'}
          </button>
        ) : (
          <button
            type="button"
            className="ea-brief-btn ea-brief-btn-primary"
            disabled={!canContinue}
            onClick={goNext}
          >
            Continue
          </button>
        )}

        {step > 0 && (
          <button type="button" className="ea-brief-btn ea-brief-btn-ghost" onClick={goBack}>
            Back
          </button>
        )}
      </div>
    </form>
  )
}
