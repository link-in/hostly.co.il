'use client'

import React, { useState, useEffect, useMemo } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AvailabilityDay = {
  date: string
  price: number
  available: boolean
  minStay: number
}

type Skin = 'purple' | 'noir' | 'slate'

type Props = {
  apiKey: string
  roomId: string
  baseUrl: string
  /** WordPress REST namespace URL (e.g. https://example.com/wp-json/hostly/v1). When provided, booking submission goes to WordPress, not Next.js. */
  wpUrl?: string
  /** Color skin: purple (default) | noir | slate */
  skin?: Skin
  /** Pre-selected check-in date from search widget (YYYY-MM-DD) */
  initialCheckIn?: string
  /** Pre-selected check-out date from search widget (YYYY-MM-DD) */
  initialCheckOut?: string
  /** Pre-selected adult count from search widget */
  initialNumAdult?: number
  /** Pre-selected child count from search widget */
  initialNumChild?: number
}

const SKINS: Record<Skin, { from: string; to: string; mid?: string; light: string; text: string }> = {
  purple: { from: '#667eea', to: '#764ba2', light: 'rgba(102,126,234,.1)', text: '#667eea' },
  noir:   { from: '#0f0c29', to: '#302b63', mid: '#16213e', light: 'rgba(15,12,41,.1)', text: '#302b63' },
  slate:  { from: '#2d3748', to: '#4a5568', light: 'rgba(45,55,72,.1)', text: '#2d3748' },
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

const normalize = (d: Date) => {
  const n = new Date(d)
  n.setHours(0, 0, 0, 0)
  return n
}

const toKey = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const addDays = (d: Date, n: number) => {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}

const addMonths = (d: Date, n: number) => {
  const c = new Date(d)
  c.setDate(1)
  c.setMonth(c.getMonth() + n)
  return c
}

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
const endOfMonth   = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0)
const isSameDay    = (a: Date, b: Date) => a.getTime() === b.getTime()

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EmbedCalendarClient({
  apiKey, roomId, baseUrl, wpUrl = '', skin = 'purple',
  initialCheckIn, initialCheckOut, initialNumAdult, initialNumChild,
}: Props) {
  const sk = SKINS[skin] ?? SKINS.purple
  const grad = `linear-gradient(135deg, ${sk.from} 0%, ${sk.mid ?? sk.to} ${sk.mid ? '50%,' : ''} ${sk.to} 100%)`
  const gradLight = sk.light
  const gradText  = sk.text

  const parseInitialDate = (s?: string): Date | null => {
    if (!s) return null
    const d = new Date(s + 'T00:00:00')
    return isNaN(d.getTime()) ? null : normalize(d)
  }

  const [currentMonth, setCurrentMonth] = useState(() => {
    const initial = parseInitialDate(initialCheckIn)
    return initial ? startOfMonth(initial) : startOfMonth(new Date())
  })
  const [checkIn, setCheckIn]   = useState<Date | null>(() => parseInitialDate(initialCheckIn))
  const [checkOut, setCheckOut] = useState<Date | null>(() => parseInitialDate(initialCheckOut))
  const [showMonthPicker, setShowMonthPicker] = useState(false)

  // Close month picker on outside click
  useEffect(() => {
    if (!showMonthPicker) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.hc-drb-wrap')) setShowMonthPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMonthPicker])
  const [availability, setAvailability] = useState<AvailabilityDay[]>([])
  // Start as false to match SSR — useEffect sets to true before the first fetch
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // When both dates arrive pre-filled from the WordPress search widget,
  // skip the calendar entirely and open the booking form immediately.
  const hasPrefilled = !!(initialCheckIn && initialCheckOut)
  const [showForm, setShowForm]     = useState(hasPrefilled)
  // TODO: remove dev prefill before production
  const [firstName, setFirstName]   = useState('ישראל')
  const [lastName, setLastName]     = useState('ישראלי')
  const [email, setEmail]           = useState('test@hostly.co.il')
  const [phone, setPhone]           = useState('0501234567')
  const [numAdult, setNumAdult]     = useState(() => initialNumAdult ?? 2)
  const [numChild, setNumChild]     = useState(() => initialNumChild ?? 0)
  const [notes, setNotes]           = useState('הזמנת בדיקה — פיתוח')
  const [submitting, setSubmitting] = useState(false)
  const [bookingError, setBookingError]   = useState<string | null>(null)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [roomName, setRoomName] = useState<string | null>(null)

  // Payment flow
  const [paymentUrl, setPaymentUrl]         = useState<string | null>(null)
  const [paymentBookingId, setPaymentBookingId] = useState<string | null>(null)
  const [paymentPolling, setPaymentPolling]  = useState(false)

  const today    = normalize(new Date())
  const todayKey = toKey(today)

  // ── Fetch room name from /api/public/property ────────────────────────────
  useEffect(() => {
    if (!apiKey || !roomId) return
    fetch(`${baseUrl}/api/public/property`, { headers: { 'x-api-key': apiKey } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const found = data?.rooms?.find((r: { id: string; name: string }) => r.id === roomId)
        if (found?.name) setRoomName(found.name)
      })
      .catch(() => null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, roomId, baseUrl])

  // ── Fetch availability from /api/public/calendar ────────────────────────
  // Re-fetches when month navigates OR when guest count changes (different per-night price).

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const from     = toKey(startOfMonth(currentMonth))
        const to       = toKey(endOfMonth(addMonths(currentMonth, 2)))
        const numGuest = Math.max(1, numAdult + numChild)

        const res = await fetch(
          `${baseUrl}/api/public/calendar?roomId=${roomId}&from=${from}&to=${to}&numGuest=${numGuest}`,
          { headers: { 'x-api-key': apiKey } }
        )

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error ?? `HTTP ${res.status}`)
        }

        const data = await res.json()
        setAvailability(data.availability ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'שגיאה בטעינת הנתונים')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, apiKey, roomId, baseUrl, numAdult, numChild])


  // ── Availability map ─────────────────────────────────────────────────────

  const availMap = useMemo(() => {
    const m: Record<string, AvailabilityDay> = {}
    availability.forEach(d => { m[d.date] = d })
    return m
  }, [availability])

  // ── Calendar grid ────────────────────────────────────────────────────────

  const days = useMemo(() => {
    const start   = startOfMonth(currentMonth)
    const end     = endOfMonth(currentMonth)
    const leading = start.getDay()
    const rows    = Math.ceil((leading + end.getDate()) / 7) * 7
    const first   = addDays(start, -leading)
    return Array.from({ length: rows }, (_, i) => addDays(first, i))
  }, [currentMonth])

  // ── Date selection ───────────────────────────────────────────────────────

  const handleDateClick = (date: Date) => {
    if (date < today) return
    const info = availMap[toKey(date)]
    if (!info?.available) return

    if (!checkIn) {
      setCheckIn(date)
      setCheckOut(null)
      return
    }

    if (!checkOut) {
      if (date <= checkIn) {
        setCheckIn(date)
        setCheckOut(null)
        return
      }
      // Validate entire range is available
      let cursor = addDays(checkIn, 1)
      while (cursor < date) {
        if (!availMap[toKey(cursor)]?.available) {
          setCheckIn(date)
          setCheckOut(null)
          return
        }
        cursor = addDays(cursor, 1)
      }
      setCheckOut(date)
      return
    }

    setCheckIn(date)
    setCheckOut(null)
  }

  // ── Price calculation ────────────────────────────────────────────────────

  const { nights, total } = useMemo(() => {
    if (!checkIn || !checkOut) return { nights: 0, total: 0 }
    let cursor = checkIn
    let n = 0, t = 0
    while (cursor < checkOut) {
      const info = availMap[toKey(cursor)]
      t += info?.price ?? 0
      n += 1
      cursor = addDays(cursor, 1)
    }
    return { nights: n, total: t }
  }, [checkIn, checkOut, availMap])

  // ── Booking submission ───────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkIn || !checkOut) return
    setSubmitting(true)
    setBookingError(null)

    try {
      /**
       * Route booking through WordPress when wpUrl is provided.
       * WordPress holds the payment credentials and creates Beds24 booking itself.
       * Fallback to Next.js /api/public/booking for manual-mode (no payment configured).
       */
      const useWordPress = Boolean(wpUrl)

      let res: Response
      if (useWordPress) {
        res = await fetch(`${wpUrl}/initiate-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId,
            firstName, lastName, email, phone, notes,
            numAdult, numChild,
            checkIn: toKey(checkIn),
            checkOut: toKey(checkOut),
            total,
          }),
        })
      } else {
        res = await fetch(`${baseUrl}/api/public/booking`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
          body: JSON.stringify({
            roomId,
            firstName, lastName, email, phone, notes,
            numAdult, numChild,
            checkIn: toKey(checkIn),
            checkOut: toKey(checkOut),
          }),
        })
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.message ?? body?.error ?? 'שגיאה ביצירת ההזמנה')
      }

      const data = await res.json()

      if (data.requiresPayment && data.paymentUrl) {
        // Payment mode — show Cardcom iframe inside embed
        setPaymentUrl(data.paymentUrl)
        setPaymentBookingId(data.bookingId ?? null)
      } else {
        // Manual (no payment) — booking confirmed directly
        resetAfterSuccess()
      }
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'שגיאה לא ידועה')
    } finally {
      setSubmitting(false)
    }
  }

  const resetAfterSuccess = () => {
    setBookingSuccess(true)
    setTimeout(() => {
      setBookingSuccess(false)
      setShowForm(false)
      setCheckIn(null)
      setCheckOut(null)
      setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setNotes('')
      setNumAdult(2); setNumChild(0)
    }, 3500)
  }

  // ── Poll WordPress booking-status after Cardcom iframe finishes ──────────

  useEffect(() => {
    if (!paymentBookingId || !wpUrl || bookingSuccess) return

    // Cardcom redirects the guest back to the WordPress site. Because the payment
    // happened inside an iframe nested inside our embed, the parent WP page detects
    // the redirect via the ?hostly_paid param and can postMessage us, but the
    // simplest approach is to poll the WP REST endpoint every 3 s.
    setPaymentPolling(true)

    const poll = async () => {
      try {
        const res = await fetch(`${wpUrl}/booking-status?bookingId=${paymentBookingId}`)
        if (res.status === 202) return  // still pending
        if (!res.ok) return
        const data = await res.json()

        if (data.status === 'paid' || data.status === 'free') {
          setPaymentPolling(false)
          setPaymentUrl(null)
          setPaymentBookingId(null)
          resetAfterSuccess()
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          setPaymentPolling(false)
          setPaymentUrl(null)
          setPaymentBookingId(null)
          setBookingError('התשלום נכשל או בוטל. ניתן לנסות שוב.')
        }
      } catch { /* network — retry next tick */ }
    }

    const interval = setInterval(poll, 3000)
    poll()
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentBookingId, bookingSuccess, wpUrl])

  // ── Auto-close modal 3s after successful booking ──────────────────────────
  useEffect(() => {
    if (!bookingSuccess) return
    const t = setTimeout(() => {
      window.parent.postMessage({ type: 'hostly:close' }, '*')
    }, 3000)
    return () => clearTimeout(t)
  }, [bookingSuccess])

  // ── Day styling ──────────────────────────────────────────────────────────

  const dayClass = (date: Date) => {
    const key  = toKey(date)
    const info = availMap[key]
    const inMonth = date.getMonth() === currentMonth.getMonth()
    const isPast  = date < today
    const isCI    = checkIn  && isSameDay(date, checkIn)
    const isCO    = checkOut && isSameDay(date, checkOut)
    const inRange = checkIn && checkOut && date > checkIn && date < checkOut

    let cls = 'hc-day'
    if (!inMonth) cls += ' hc-other'
    if (isPast)          cls += ' hc-past'
    else if (!info?.available) cls += ' hc-busy'
    else if (isCI || isCO)     cls += ' hc-selected'
    else if (inRange)          cls += ' hc-range'
    else                       cls += ' hc-avail'
    if (key === todayKey) cls += ' hc-today'
    return cls
  }

  const monthLabel = new Intl.DateTimeFormat('he-IL', {
    month: 'long', year: 'numeric',
  }).format(currentMonth)

  // ── Render: Cardcom payment iframe ──────────────────────────────────────

  if (paymentUrl) {
    return (
      <div className="hc-wrap" style={{ direction: 'rtl' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <button
            className="hc-back-btn"
            onClick={() => { setPaymentUrl(null); setPaymentBookingId(null) }}
          >
            ← חזרה
          </button>
          <span style={{ fontWeight: 600, fontSize: '1rem' }}>תשלום מאובטח</span>
        </div>

        <div className="hc-summary-card" style={{ marginBottom: 18 }}>
          <div className="hc-summary-grid">
            <div><strong>כניסה:</strong> {checkIn?.toLocaleDateString('he-IL')}</div>
            <div><strong>יציאה:</strong> {checkOut?.toLocaleDateString('he-IL')}</div>
            <div className="hc-total"><strong>לתשלום:</strong> ₪{total.toLocaleString()}</div>
          </div>
        </div>

        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.1)' }}>
          <iframe
            src={paymentUrl}
            title="תשלום מאובטח — Cardcom"
            style={{ width: '100%', height: 560, border: 'none', display: 'block' }}
            allow="payment"
          />
          {paymentPolling && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(255,255,255,.85)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
            }}>
              <div className="hc-loading">מעבד תשלום…</div>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', color: '#888', fontSize: '.8rem', marginTop: 12 }}>
          🔒 הסליקה מבוצעת על ידי Cardcom — מאובטח בתקן PCI DSS
        </p>

        <style>{`
          .hc-back-btn {
            background: transparent; border: 2px solid #667eea; color: #667eea;
            padding: 8px 18px; border-radius: 20px; cursor: pointer; font-size: .9rem;
            transition: all .2s;
          }
          .hc-back-btn:hover { background: #667eea; color: #fff; }
          .hc-summary-card {
            background: linear-gradient(135deg,#667eea,#764ba2);
            color: #fff; padding: 18px 22px; border-radius: 14px;
          }
          .hc-summary-grid {
            display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
            background: rgba(255,255,255,.15); padding: 14px; border-radius: 10px;
          }
          .hc-total { grid-column: 1 / -1; font-size: 1.3rem; font-weight: 700; text-align: center; padding-top: 10px; border-top: 2px solid rgba(255,255,255,.3); margin-top: 8px; }
          .hc-loading { text-align: center; padding: 40px; color: #888; }
        `}</style>
      </div>
    )
  }

  // ── Render: success ──────────────────────────────────────────────────────

  if (bookingSuccess) {
    return (
      <div className="hc-wrap" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div className="hc-success-icon">✓</div>
        <h3 style={{ color: '#4caf50', marginBottom: 10 }}>ההזמנה נוצרה בהצלחה!</h3>
        <p style={{ color: '#666' }}>תקבל אישור בהודעת WhatsApp בקרוב.</p>
      </div>
    )
  }

  // ── Render: booking form ─────────────────────────────────────────────────

  if (showForm) {
    const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
    const isValidPhone = (v: string) => /^0\d{8,9}$/.test(v.replace(/[\s-]/g, ''))

    // Luxury SVG icon set — 20×20 viewBox, stroke-based thin lines
    const S = { fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
    const Svg = ({ children }: { children: React.ReactNode }) => (
      <svg width="17" height="17" viewBox="0 0 20 20" aria-hidden="true" {...S}>{children}</svg>
    )
    const icons = {
      calendar: <Svg><rect x="3" y="4" width="14" height="14" rx="2"/><path d="M3 9h14M7 2v4M13 2v4"/></Svg>,
      moon:     <Svg><path d="M17 13A7 7 0 0 1 7 3a7 7 0 1 0 10 10z"/></Svg>,
      person:   <Svg><circle cx="10" cy="7" r="3"/><path d="M4 18a6 6 0 0 1 12 0"/></Svg>,
      email:    <Svg><rect x="2" y="5" width="16" height="12" rx="2"/><path d="m2 7 8 5 8-5"/></Svg>,
      phone:    <Svg><path d="M6.5 2h3l1 4-2 1.5a10 10 0 0 0 4 4L14 9.5l4 1V14a2 2 0 0 1-2 2A16 16 0 0 1 2 6a2 2 0 0 1 2-2z"/></Svg>,
      notes:    <Svg><path d="M6 2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M7 7h6M7 10h6M7 13h4"/></Svg>,
      adults:   <Svg><circle cx="8" cy="7" r="3"/><path d="M2 18a6 6 0 0 1 12 0"/><circle cx="15" cy="7" r="2.5"/><path d="M13 18a4 4 0 0 1 6 0"/></Svg>,
      children: <Svg><circle cx="10" cy="7" r="3"/><path d="M5 18c0-3 2-5 5-5s5 2 5 5"/><path d="M13.5 3.5a2 2 0 0 1 0 3"/></Svg>,
      shield:   <Svg><path d="M10 2 L17 5 V9 C17 13.5 13.5 17 10 18 C6.5 17 3 13.5 3 9 V5 Z"/><path d="M7 10l2 2 4-4"/></Svg>,
      arrow:    <Svg><path d="M4 10h12"/><path d="m12 6 4 4-4 4"/></Svg>,
      star:     <Svg><path d="M10 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L10 14.2l-4.8 2.7.9-5.4L2.2 7.7l5.4-.8z"/></Svg>,
    }

    const Field = ({
      label, icon, children, valid, touched,
    }: { label: string; icon: React.ReactNode; children: React.ReactNode; valid?: boolean; touched?: boolean }) => (
      <div className="hcf-field">
        <label className="hcf-label">
          <span className="hcf-icon">{icon}</span>
          {label}
          {touched && valid  !== undefined && (
            <span className={`hcf-badge ${valid ? 'hcf-badge--ok' : 'hcf-badge--err'}`}>
              {valid ? '✓' : '✗'}
            </span>
          )}
        </label>
        {children}
      </div>
    )

    const Counter = ({ label, icon, value, min, max, onChange }: {
      label: string; icon: React.ReactNode; value: number; min: number; max: number; onChange: (n: number) => void
    }) => (
      <div className="hcf-counter">
        <div className="hcf-counter__label">
          <span style={{ display:'flex', alignItems:'center' }}>{icon}</span> {label}
        </div>
        <div className="hcf-counter__ctrl">
          <button type="button" className="hcf-counter__btn" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>−</button>
          <span className="hcf-counter__val">{value}</span>
          <button type="button" className="hcf-counter__btn" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button>
        </div>
      </div>
    )

    return (
      <div className="hc-wrap hcf-wrap" style={{ direction: 'rtl' }}>

        {/* Top row: back button + room name badge */}
        <div className="hcf-topbar">
          <button
            className="hcf-back"
            onClick={() => {
              window.parent.postMessage({ type: 'hostly:back-to-calendar' }, '*');
            }}
          >
            <span>→</span> חזרה ללוח שנה
          </button>

          {roomName && (
            <div className="hcf-room-name">
              <span className="hcf-room-name__ico">{icons.star}</span>
              <span>{roomName}</span>
            </div>
          )}
        </div>

        {/* Summary strip */}
        <div className="hcf-summary">
          <div className="hcf-summary__item">
            <span className="hcf-summary__ico">{icons.calendar}</span>
            <div>
              <div className="hcf-summary__lbl">כניסה</div>
              <div className="hcf-summary__val">{checkIn?.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            </div>
          </div>
          <div className="hcf-summary__div" />
          <div className="hcf-summary__item">
            <span className="hcf-summary__ico">{icons.calendar}</span>
            <div>
              <div className="hcf-summary__lbl">יציאה</div>
              <div className="hcf-summary__val">{checkOut?.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            </div>
          </div>
          <div className="hcf-summary__div" />
          <div className="hcf-summary__item">
            <span className="hcf-summary__ico">{icons.moon}</span>
            <div>
              <div className="hcf-summary__lbl">לילות</div>
              <div className="hcf-summary__val">{nights}</div>
            </div>
          </div>
          <div className="hcf-summary__price" suppressHydrationWarning>
            <div className="hcf-summary__lbl">סה״כ לתשלום</div>
            <div className="hcf-summary__total" suppressHydrationWarning>
              {loading ? '...' : total > 0 ? `₪${total.toLocaleString('he-IL')}` : '—'}
            </div>
          </div>
        </div>

        {/* Form */}
        <form className="hcf-form" onSubmit={handleSubmit} noValidate>

          <div className="hcf-section-title">
            מספר אורחים
            {loading && <span style={{ fontSize: '.7rem', fontWeight: 400, color: '#aaa', marginRight: 6 }}>מחשב מחיר…</span>}
          </div>

          <div className="hcf-counters">
            <Counter label="מבוגרים (18+)" icon={icons.adults}   value={numAdult} min={1} max={10} onChange={setNumAdult} />
            <Counter label="ילדים (0-17)"  icon={icons.children} value={numChild} min={0} max={8}  onChange={setNumChild} />
          </div>

          <div className="hcf-section-title" style={{ marginTop: 8 }}>פרטים אישיים</div>

          <div className="hcf-row">
            <Field label="שם פרטי" icon={icons.person} valid={firstName.trim().length >= 2} touched={firstName.length > 0}>
              <input
                className={`hcf-input ${firstName.length > 0 ? (firstName.trim().length >= 2 ? 'hcf-input--ok' : 'hcf-input--err') : ''}`}
                placeholder="ישראל"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
              />
            </Field>
            <Field label="שם משפחה" icon={icons.person} valid={lastName.trim().length >= 2} touched={lastName.length > 0}>
              <input
                className={`hcf-input ${lastName.length > 0 ? (lastName.trim().length >= 2 ? 'hcf-input--ok' : 'hcf-input--err') : ''}`}
                placeholder="ישראלי"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
              />
            </Field>
          </div>

          <Field label="כתובת אימייל" icon={icons.email} valid={isValidEmail(email)} touched={email.length > 0}>
            <input
              type="email"
              className={`hcf-input ${email.length > 0 ? (isValidEmail(email) ? 'hcf-input--ok' : 'hcf-input--err') : ''}`}
              placeholder="israel@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field label="מספר טלפון" icon={icons.phone} valid={isValidPhone(phone)} touched={phone.length > 0}>
            <input
              type="tel"
              className={`hcf-input ${phone.length > 0 ? (isValidPhone(phone) ? 'hcf-input--ok' : 'hcf-input--err') : ''}`}
              placeholder="050-0000000"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              dir="ltr"
              style={{ textAlign: 'right' }}
            />
          </Field>

          <div className="hcf-section-title" style={{ marginTop: 8 }}>בקשות מיוחדות</div>
          <Field label="הערות" icon={icons.notes}>
            <textarea
              className="hcf-input hcf-textarea"
              rows={3}
              placeholder="שעת הגעה משוערת, בקשות מיוחדות, אלרגיות…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </Field>

          {bookingError && (
            <div className="hcf-error-box">
              <span>⚠️</span> {bookingError}
            </div>
          )}

          {!loading && total === 0 && (
            <div className="hcf-error-box">
              <span>⚠️</span> לא ניתן לאחזר מחיר עבור התאריכים שנבחרו. אנא חזור ובחר תאריכים אחרים.
            </div>
          )}

          <button
            type="submit"
            className={`hcf-submit ${(submitting || loading) ? 'hcf-submit--loading' : ''}`}
            disabled={submitting || loading || total === 0}
            suppressHydrationWarning
          >
            <span suppressHydrationWarning>
              {submitting
                ? <><span className="hcf-spinner" /> מעבד הזמנה…</>
                : loading
                  ? <><span className="hcf-spinner" /> מחשב מחיר…</>
                  : <>אשר הזמנה — ₪{total.toLocaleString('he-IL')}</>
              }
            </span>
          </button>

          <p className="hcf-secure">
            <span style={{ display:'inline-flex', alignItems:'center', gap:5, verticalAlign:'middle' }}>{icons.shield}</span>
            {' '}פרטיך מאובטחים ולא יועברו לצד שלישי
          </p>

        </form>

        <style>{`
          .hcf-wrap {
            max-width: 640px; margin: 0 auto;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            --hc-grad: ${grad};
            --hc-from: ${sk.from};
            --hc-to: ${sk.to};
            --hc-light: ${gradLight};
            --hc-text: ${gradText};
          }
          /* ── Top bar: back + room badge ── */
          .hcf-topbar {
            display: flex; align-items: center; justify-content: space-between;
            gap: 12px; margin-bottom: 20px; flex-wrap: wrap;
          }
          .hcf-back {
            display: inline-flex; align-items: center; gap: 6px;
            background: none; border: none; color: var(--hc-text); font-size: .9rem;
            font-weight: 600; cursor: pointer; padding: 0;
            transition: gap .2s;
          }
          .hcf-back:hover { gap: 10px; }

          /* ── Room name badge ── */
          .hcf-room-name {
            display: inline-flex; align-items: center; gap: 8px;
            background: var(--hc-light); color: var(--hc-text);
            border: 1.5px solid var(--hc-text); border-radius: 30px;
            padding: 5px 14px; font-size: .85rem; font-weight: 700;
          }
          .hcf-room-name__ico { display: flex; align-items: center; flex-shrink: 0; }

          /* ── Summary ── */
          .hcf-summary {
            background: var(--hc-grad);
            border-radius: 18px; padding: 20px 24px; margin-bottom: 24px;
            display: flex; align-items: center; flex-wrap: wrap; gap: 12px;
            color: #fff; box-shadow: 0 8px 32px rgba(0,0,0,.25);
          }
          .hcf-summary__item { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 100px; }
          .hcf-summary__ico { display:flex; align-items:center; justify-content:center; width:36px; height:36px; background:rgba(255,255,255,.2); border-radius:10px; flex-shrink:0; }
          .hcf-summary__lbl { font-size: .72rem; opacity: .8; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 2px; }
          .hcf-summary__val { font-size: .95rem; font-weight: 700; }
          .hcf-summary__div { width: 1px; height: 40px; background: rgba(255,255,255,.25); flex-shrink: 0; }
          .hcf-summary__price { margin-right: auto; text-align: center; background: rgba(255,255,255,.18); border-radius: 12px; padding: 10px 18px; }
          .hcf-summary__total { font-size: 1.6rem; font-weight: 800; }

          /* ── Form ── */
          .hcf-form { background: #fff; border-radius: 18px; padding: 28px; box-shadow: 0 2px 24px rgba(0,0,0,.07); }
          .hcf-section-title {
            font-size: .72rem; font-weight: 700; text-transform: uppercase;
            letter-spacing: .08em; color: #999; margin-bottom: 14px; padding-bottom: 6px;
            border-bottom: 1px solid #f0f0f0;
          }
          .hcf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
          .hcf-field { margin-bottom: 18px; }
          .hcf-label {
            display: flex; align-items: center; gap: 6px;
            font-size: .86rem; font-weight: 600; color: #444; margin-bottom: 8px;
          }
          .hcf-icon { font-size: .95rem; }
          .hcf-badge {
            margin-right: auto; font-size: .75rem; font-weight: 700;
            width: 20px; height: 20px; border-radius: 50%;
            display: inline-flex; align-items: center; justify-content: center;
          }
          .hcf-badge--ok  { background: #e8f5e9; color: #2e7d32; }
          .hcf-badge--err { background: #ffebee; color: #c62828; }
          .hcf-input {
            width: 100%; padding: 13px 16px; border: 2px solid #e8e8e8;
            border-radius: 12px; font-size: .95rem; background: #fafafa;
            transition: border-color .2s, box-shadow .2s, background .2s;
            font-family: inherit; color: #222; outline: none;
          }
          .hcf-input:focus { border-color: var(--hc-from); background: #fff; box-shadow: 0 0 0 4px var(--hc-light); }
          .hcf-input--ok  { border-color: #66bb6a; background: #f9fff9; }
          .hcf-input--ok:focus { border-color: #43a047; box-shadow: 0 0 0 4px rgba(102,187,106,.1); }
          .hcf-input--err { border-color: #ef5350; background: #fffafa; }
          .hcf-input--err:focus { border-color: #e53935; box-shadow: 0 0 0 4px rgba(239,83,80,.1); }
          .hcf-textarea { resize: vertical; min-height: 90px; }

          /* ── Counters ── */
          .hcf-counters { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
          .hcf-counter {
            border: 2px solid #e8e8e8; border-radius: 14px; padding: 14px 16px;
            display: flex; align-items: center; justify-content: space-between;
            background: #fafafa; transition: border-color .2s;
          }
          .hcf-counter:focus-within { border-color: var(--hc-from); }
          .hcf-counter__label { font-size: .88rem; font-weight: 600; color: #444; display: flex; gap: 6px; }
          .hcf-counter__ctrl { display: flex; align-items: center; gap: 10px; }
          .hcf-counter__btn {
            width: 34px; height: 34px; border-radius: 8px; border: none;
            background: var(--hc-light); color: var(--hc-text); font-size: 1.3rem; font-weight: 600;
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            line-height: 1; padding: 0; transition: background .15s, color .15s;
          }
          .hcf-counter__btn:hover:not(:disabled) { background: var(--hc-grad); color: #fff; }
          .hcf-counter__btn:disabled { opacity: .25; cursor: not-allowed; }
          .hcf-counter__val { font-size: 1.15rem; font-weight: 700; min-width: 22px; text-align: center; color: #222; }

          /* ── Error ── */
          .hcf-error-box {
            background: #fff3f3; border: 2px solid #ffcdd2; border-radius: 12px;
            padding: 14px 16px; color: #c62828; font-weight: 600; margin-bottom: 18px;
            display: flex; gap: 8px; align-items: flex-start;
          }

          /* ── Submit ── */
          .hcf-submit {
            width: 100%; padding: 16px 24px; border: none; border-radius: 14px;
            background: var(--hc-grad);
            color: #fff; font-size: 1.05rem; font-weight: 700; cursor: pointer;
            display: flex; align-items: center; justify-content: center; gap: 8px;
            transition: opacity .2s, transform .1s;
            box-shadow: 0 6px 20px rgba(0,0,0,.3);
          }
          .hcf-submit:not(:disabled):hover { opacity: .92; transform: translateY(-1px); }
          .hcf-submit:disabled { opacity: .55; cursor: not-allowed; box-shadow: none; }
          .hcf-spinner {
            width: 18px; height: 18px; border: 3px solid rgba(255,255,255,.3);
            border-top-color: #fff; border-radius: 50%;
            animation: hcf-spin .7s linear infinite; display: inline-block;
          }
          @keyframes hcf-spin { to { transform: rotate(360deg); } }
          .hcf-secure { text-align: center; color: #aaa; font-size: .78rem; margin-top: 12px; margin-bottom: 0; }

          @media (max-width: 520px) {
            .hcf-row { grid-template-columns: 1fr; }
            .hcf-counters { grid-template-columns: 1fr; }
            .hcf-summary { flex-direction: column; align-items: flex-start; }
            .hcf-summary__div { width: 100%; height: 1px; }
            .hcf-summary__price { width: 100%; }
          }
        `}</style>
      </div>
    )
  }

  // ── Render: no dates selected (fallback) ────────────────────────────────
  // The calendar has been removed — dates must be pre-filled by the
  // WordPress search widget. Show a friendly prompt if they are missing.

  return (
    <div className="hc-wrap" style={{ direction: 'rtl', textAlign: 'center', padding: '60px 20px', fontFamily: 'sans-serif' }}>
      <p style={{ fontSize: '1.1rem', color: '#555', marginBottom: 20 }}>
        אנא בחר תאריכים דרך חלון ההזמנה
      </p>
      <button
        onClick={() => window.parent.postMessage({ type: 'hostly:close' }, '*')}
        style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', border: 'none', borderRadius: 30, padding: '12px 28px', cursor: 'pointer', fontSize: '1rem' }}
      >
        סגור
      </button>
    </div>
  )
}