'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardHeader from '@/components/DashboardHeader'

// ── Types ────────────────────────────────────────────────────────────────────

interface ApiKey {
  id: string
  name: string
  keyPreview: string
  allowedRoomIds: string[]
  isActive: boolean
  createdAt: string
  lastUsedAt: string | null
}

interface NewlyCreatedKey {
  id: string
  name: string
  key: string
}

type CreateState = 'idle' | 'loading' | 'done' | 'error'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function ApiKeysPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create form
  const [newKeyName, setNewKeyName] = useState('')
  const [createState, setCreateState] = useState<CreateState>('idle')
  const [createError, setCreateError] = useState<string | null>(null)
  const [newlyCreated, setNewlyCreated] = useState<NewlyCreatedKey | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)


  // Inline delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Toggle active
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Embed settings — payment required toggle
  const [paymentRequired, setPaymentRequired] = useState(false)
  const [paymentToggling, setPaymentToggling] = useState(false)

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  // ── Fetch keys ─────────────────────────────────────────────────────────────
  const fetchKeys = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/dashboard/api-keys')
      if (!res.ok) throw new Error('שגיאה בטעינת המפתחות')
      const data = await res.json()
      setKeys(data.keys ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') fetchKeys()
  }, [status])

  // ── Fetch embed settings ───────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/dashboard/embed-settings')
      .then(r => r.json())
      .then(d => setPaymentRequired(d.paymentRequired ?? false))
      .catch(() => {})
  }, [status])

  const handlePaymentToggle = async () => {
    setPaymentToggling(true)
    try {
      const res = await fetch('/api/dashboard/embed-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentRequired: !paymentRequired }),
      })
      if (res.ok) setPaymentRequired(p => !p)
    } catch {
      // silent
    } finally {
      setPaymentToggling(false)
    }
  }

  // ── Create key ─────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!newKeyName.trim()) return
    setCreateState('loading')
    setCreateError(null)
    setNewlyCreated(null)
    try {
      const res = await fetch('/api/dashboard/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'שגיאה ביצירת מפתח')
      setNewlyCreated({ id: data.id, name: data.name, key: data.key })
      setCreateState('done')
      setNewKeyName('')
      await fetchKeys()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'שגיאה')
      setCreateState('error')
    }
  }

  // ── Copy helpers ───────────────────────────────────────────────────────────
  const copyKey = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setKeyCopied(true)
    setTimeout(() => setKeyCopied(false), 3000)
  }

  // ── Toggle active ──────────────────────────────────────────────────────────
  const handleToggle = async (key: ApiKey) => {
    setTogglingId(key.id)
    try {
      const res = await fetch(`/api/dashboard/api-keys/${key.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !key.isActive }),
      })
      if (!res.ok) throw new Error()
      setKeys((prev) =>
        prev.map((k) => (k.id === key.id ? { ...k, isActive: !k.isActive } : k)),
      )
    } catch {
      setError('שגיאה בעדכון סטטוס המפתח')
    } finally {
      setTogglingId(null)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/dashboard/api-keys/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setKeys((prev) => prev.filter((k) => k.id !== id))
      setConfirmDeleteId(null)
      if (newlyCreated?.id === id) setNewlyCreated(null)
    } catch {
      setError('שגיאה במחיקת המפתח')
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (status === 'loading' || !session) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-light" />
      </div>
    )
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh' }}>
      <div className="container py-4" style={{ maxWidth: 760 }}>

        {/* Header */}
        <DashboardHeader session={session} currentPage="api-keys" title="מפתחות API" />

        <div className="mt-4">

          {/* ── Create new key card ────────────────────────────────────── */}
          <div
            className="card border-0 shadow-sm mb-4"
            style={{ borderRadius: 14, overflow: 'hidden' }}
          >
            <div
              className="card-header border-0 py-3 px-4"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              <h5 className="mb-0 fw-bold text-white d-flex align-items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M2 12h3M19 12h3M12 2v3M12 19v3" /><line x1="4.22" y1="4.22" x2="6.34" y2="6.34" /><line x1="17.66" y1="17.66" x2="19.78" y2="19.78" /><line x1="4.22" y1="19.78" x2="6.34" y2="17.66" /><line x1="17.66" y1="6.34" x2="19.78" y2="4.22" /></svg>
                צור מפתח API חדש
              </h5>
            </div>
            <div className="card-body p-4">
              <p className="text-muted small mb-3">
                המפתח מוצג פעם אחת בלבד — העתק אותו מיד ושמור במקום בטוח.
              </p>

              <div className="d-flex gap-2 mb-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="שם המפתח — למשל: וורדפרס ראשי"
                  value={newKeyName}
                  onChange={(e) => {
                    setNewKeyName(e.target.value)
                    setCreateState('idle')
                    setCreateError(null)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  disabled={createState === 'loading'}
                  style={{ borderRadius: 8 }}
                />
                <button
                  type="button"
                  className="btn fw-bold text-nowrap"
                  style={{
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    minWidth: 120,
                  }}
                  onClick={handleCreate}
                  disabled={createState === 'loading' || !newKeyName.trim()}
                >
                  {createState === 'loading'
                    ? <span className="spinner-border spinner-border-sm" />
                    : '🔑 צור מפתח'}
                </button>
              </div>

              {createError && (
                <div className="alert alert-danger py-2 small mb-0">{createError}</div>
              )}

              {/* Newly-created key — shown once */}
              {newlyCreated && (
                <div
                  className="mt-3 p-3 rounded-3"
                  style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #86efac',
                  }}
                >
                  <div className="fw-semibold text-success mb-2 d-flex align-items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    המפתח נוצר — העתק אותו עכשיו, הוא לא יוצג שוב
                  </div>
                  <div className="d-flex gap-2 align-items-center">
                    <code
                      className="flex-grow-1 px-3 py-2 rounded-2 small"
                      style={{
                        background: '#dcfce7',
                        border: '1px solid #86efac',
                        wordBreak: 'break-all',
                        direction: 'ltr',
                        display: 'block',
                        userSelect: 'all',
                      }}
                    >
                      {newlyCreated.key}
                    </code>
                    <button
                      type="button"
                      className="btn btn-sm fw-bold"
                      style={{
                        background: keyCopied ? '#16a34a' : '#374151',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        flexShrink: 0,
                        minWidth: 80,
                      }}
                      onClick={() => copyKey(newlyCreated.key)}
                    >
                      {keyCopied ? '✓ הועתק' : 'העתק'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Keys list ─────────────────────────────────────────────── */}
          <div
            className="card border-0 shadow-sm mb-4"
            style={{ borderRadius: 14, overflow: 'hidden' }}
          >
            <div
              className="card-header border-0 py-3 px-4 d-flex justify-content-between align-items-center"
              style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}
            >
              <h6 className="mb-0 fw-bold text-dark">
                המפתחות שלי
                {keys.length > 0 && (
                  <span
                    className="badge ms-2"
                    style={{
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      borderRadius: 20,
                      fontSize: 11,
                    }}
                  >
                    {keys.length}
                  </span>
                )}
              </h6>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={fetchKeys}
                disabled={loading}
                style={{ borderRadius: 8 }}
              >
                {loading ? <span className="spinner-border spinner-border-sm" /> : '↻ רענן'}
              </button>
            </div>

            <div className="card-body p-0">
              {loading && (
                <div className="text-center py-5 text-muted">
                  <div className="spinner-border spinner-border-sm mb-2" />
                  <div className="small">טוען מפתחות...</div>
                </div>
              )}

              {!loading && error && (
                <div className="alert alert-danger m-3 mb-0">{error}</div>
              )}

              {!loading && !error && keys.length === 0 && (
                <div className="text-center py-5 text-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2 d-block mx-auto opacity-50"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>
                  <div className="small">אין עדיין מפתחות — צור את הראשון למעלה</div>
                </div>
              )}

              {!loading && keys.map((key, idx) => (
                <div
                  key={key.id}
                  className="px-4 py-3"
                  style={{
                    borderBottom: idx < keys.length - 1 ? '1px solid #f3f4f6' : 'none',
                    opacity: key.isActive ? 1 : 0.55,
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start gap-3">
                    {/* Left: info */}
                    <div style={{ minWidth: 0 }}>
                      <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                        <span className="fw-semibold" style={{ fontSize: 15 }}>{key.name}</span>
                        <span
                          className="badge"
                          style={{
                            fontSize: 10,
                            borderRadius: 20,
                            background: key.isActive ? '#dcfce7' : '#fee2e2',
                            color: key.isActive ? '#16a34a' : '#dc2626',
                          }}
                        >
                          {key.isActive ? 'פעיל' : 'מושבת'}
                        </span>
                      </div>
                      <code
                        className="small d-block mb-1"
                        style={{ color: '#6b7280', direction: 'ltr', fontSize: 12 }}
                      >
                        {key.keyPreview}
                      </code>
                      <div className="small text-muted" style={{ fontSize: 11 }}>
                        נוצר: {formatDate(key.createdAt)}
                        {key.lastUsedAt && (
                          <> &nbsp;·&nbsp; שימוש אחרון: {formatDate(key.lastUsedAt)}</>
                        )}
                        {!key.lastUsedAt && (
                          <> &nbsp;·&nbsp; טרם שומש</>
                        )}
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="d-flex gap-2 align-items-center flex-shrink-0">
                      {/* Toggle */}
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          background: key.isActive ? '#fef3c7' : '#d1fae5',
                          color: key.isActive ? '#92400e' : '#065f46',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                        }}
                        onClick={() => handleToggle(key)}
                        disabled={togglingId === key.id}
                      >
                        {togglingId === key.id
                          ? <span className="spinner-border spinner-border-sm" />
                          : key.isActive ? 'כבה' : 'הפעל'}
                      </button>

                      {/* Delete */}
                      {confirmDeleteId === key.id ? (
                        <div className="d-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-danger fw-bold"
                            style={{ borderRadius: 8, fontSize: 12 }}
                            onClick={() => handleDelete(key.id)}
                            disabled={deleting}
                          >
                            {deleting ? <span className="spinner-border spinner-border-sm" /> : 'מחק'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            style={{ borderRadius: 8, fontSize: 12 }}
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            ביטול
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          style={{ borderRadius: 8, fontSize: 12 }}
                          onClick={() => setConfirmDeleteId(key.id)}
                        >
                          מחק
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Embed Booking Settings ─────────────────────────────────── */}
          <div className="card border-0 shadow-sm mt-4" style={{ borderRadius: 16 }}>
            <div className="card-body p-4">
              <h5 className="fw-bold mb-1" style={{ fontSize: '1.05rem' }}>
                הגדרות הזמנה
              </h5>
              <p className="text-muted mb-4" style={{ fontSize: '0.88rem' }}>
                קביעת אופן קבלת הזמנות מהלוח שנה המוטמע באתר הלקוח
              </p>

              <div
                className="d-flex align-items-center justify-content-between p-3"
                style={{ background: '#f8faff', borderRadius: 12, border: '1px solid #e8edf5' }}
              >
                <div>
                  <div className="fw-semibold" style={{ fontSize: '0.95rem' }}>
                    דרוש תשלום לפני אישור הזמנה
                  </div>
                  <div className="text-muted mt-1" style={{ fontSize: '0.83rem' }}>
                    {paymentRequired
                      ? 'אורחים ישלמו בכרטיס אשראי (Cardcom) לפני שההזמנה תאושר ב-Beds24'
                      : 'הזמנות מאושרות מיד — תקבל התראת WhatsApp ותחזור ללקוח בעצמך'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePaymentToggle}
                  disabled={paymentToggling}
                  style={{
                    width: 52,
                    height: 28,
                    borderRadius: 14,
                    border: 'none',
                    background: paymentRequired ? '#667eea' : '#d1d5db',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                  aria-label="Toggle payment required"
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 3,
                      right: paymentRequired ? 3 : 'auto',
                      left: paymentRequired ? 'auto' : 3,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                      transition: 'all 0.2s',
                    }}
                  />
                </button>
              </div>

              {paymentRequired && (
                <div
                  className="mt-3 p-3"
                  style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, fontSize: '0.83rem', color: '#78350f' }}
                >
                  <strong>⚠️ נדרש:</strong> ודא שמשתני הסביבה <code>CARDCOM_TERMINAL_NUMBER</code> ו-<code>CARDCOM_API_NAME</code> מוגדרים בשרת.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
