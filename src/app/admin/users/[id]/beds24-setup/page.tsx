'use client'

import React, { useState, use } from 'react'
import Link from 'next/link'
import { CheckCircle, Loader2, KeyRound, Database, Server } from 'lucide-react'

type StepStatus = 'pending' | 'active' | 'done' | 'error'

interface StepState {
  invite: StepStatus
  ids: StepStatus
  cache: StepStatus
}

export default function Beds24SetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = use(params)

  // Step 1 — Invite Code
  const [inviteCode, setInviteCode] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteDone, setInviteDone] = useState(false)
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null)

  // Step 2 — Property + Room IDs
  const [propertyId, setPropertyId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [roomName, setRoomName] = useState('')
  const [idsLoading, setIdsLoading] = useState(false)
  const [idsError, setIdsError] = useState<string | null>(null)
  const [idsDone, setIdsDone] = useState(false)

  // Step 3 — Seed Cache
  const [cacheLoading, setCacheLoading] = useState(false)
  const [cacheError, setCacheError] = useState<string | null>(null)
  const [cacheDone, setCacheDone] = useState(false)
  const [cachedDays, setCachedDays] = useState<number | null>(null)

  const steps: StepState = {
    invite: inviteDone ? 'done' : inviteError ? 'error' : 'active',
    ids: !inviteDone ? 'pending' : idsDone ? 'done' : idsError ? 'error' : 'active',
    cache: !idsDone ? 'pending' : cacheDone ? 'done' : cacheError ? 'error' : 'active',
  }

  // ── Step 1: Exchange invite code ──────────────────────────────────────────
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError(null)
    setInviteLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/beds24-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = typeof data.error === 'string'
          ? data.error
          : JSON.stringify(data.error)
        throw new Error(msg)
      }
      setTokenExpiry(data.expiresIn ?? null)
      setInviteDone(true)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'שגיאה לא ידועה')
    } finally {
      setInviteLoading(false)
    }
  }

  // ── Step 2: Save property + room IDs ──────────────────────────────────────
  const handleIdsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIdsError(null)
    setIdsLoading(true)

    const roomIdValue = roomName.trim()
      ? `${roomId.trim()}:${roomName.trim()}`
      : roomId.trim()

    try {
      // Fetch current user to get required fields (email + displayName) for PUT
      const usersRes = await fetch('/api/admin/users')
      const usersData = await usersRes.json()
      const user = (usersData.users ?? []).find((u: { id: string }) => u.id === userId)
      if (!user) throw new Error('משתמש לא נמצא')

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          displayName: user.displayName,
          firstName: user.firstName,
          lastName: user.lastName,
          propertyId: propertyId.trim(),
          roomId: roomIdValue,
          landingPageUrl: user.landingPageUrl,
          phoneNumber: user.phoneNumber,
          role: user.role,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'שגיאה בשמירה')
      setIdsDone(true)
    } catch (err) {
      setIdsError(err instanceof Error ? err.message : 'שגיאה לא ידועה')
    } finally {
      setIdsLoading(false)
    }
  }

  // ── Step 3: Seed availability cache ───────────────────────────────────────
  const handleSeedCache = async () => {
    setCacheError(null)
    setCacheLoading(true)

    const roomIdClean = roomId.trim()

    try {
      const res = await fetch('/api/admin/cache/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, propertyId: propertyId.trim(), roomId: roomIdClean }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'שגיאה ב-Cache')
      setCachedDays(data.upserted ?? null)
      setCacheDone(true)
    } catch (err) {
      setCacheError(err instanceof Error ? err.message : 'שגיאה לא ידועה')
    } finally {
      setCacheLoading(false)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const stepBadge = (status: StepStatus, label: string) => {
    const colors: Record<StepStatus, { bg: string; text: string; border: string }> = {
      pending: { bg: '#f9fafb', text: '#9ca3af', border: '#e5e7eb' },
      active:  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
      done:    { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
      error:   { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
    }
    const c = colors[status]
    return (
      <span
        style={{
          background: c.bg, color: c.text, border: `1px solid ${c.border}`,
          borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600,
        }}
      >
        {status === 'done' ? '✓ ' : ''}{label}
      </span>
    )
  }

  const allDone = inviteDone && idsDone && cacheDone

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .spin { animation: spin .8s linear infinite }
        @keyframes spin { to { transform: rotate(360deg) } }
        .step-card {
          border-radius: 12px;
          border: 1.5px solid #e5e7eb;
          margin-bottom: 16px;
          overflow: hidden;
          transition: border-color .2s;
        }
        .step-card.active  { border-color: #bfdbfe; }
        .step-card.done    { border-color: #86efac; }
        .step-card.error   { border-color: #fca5a5; }
        .step-card.pending { opacity: .55; }
        .step-header {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 18px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          font-weight: 700; font-size: 15px;
        }
        .step-body { padding: 18px; }
      `}</style>

      <div dir="rtl" style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%)' }}>
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-lg-6">

              {/* ── Header ── */}
              <div className="card border-0 shadow-lg mb-4" style={{ borderRadius: 16 }}>
                <div
                  className="card-header border-0 text-white"
                  style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: '16px 16px 0 0', padding: '1.5rem' }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h1 className="h4 mb-1 fw-bold d-flex align-items-center gap-2">
                        <Server size={20} /> הגדרת Beds24
                      </h1>
                      <small className="opacity-75">חיבור חשבון-משנה ידני — שלושה שלבים</small>
                    </div>
                    <Link href={`/admin/users/${userId}/edit`}>
                      <button className="btn btn-light btn-sm">← חזרה לעריכה</button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* ── Step 1: Invite Code ── */}
              <div className={`step-card ${steps.invite}`}>
                <div className="step-header">
                  <KeyRound size={18} style={{ color: steps.invite === 'done' ? '#15803d' : '#667eea', flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>שלב 1 — Invite Code</span>
                  {stepBadge(steps.invite, steps.invite === 'done' ? 'הושלם' : steps.invite === 'error' ? 'שגיאה' : 'ממתין')}
                </div>
                <div className="step-body">
                  <p className="text-muted small mb-3">
                    היכנס ל-Beds24 בחשבון-המשנה של הלקוח, עבור אל
                    {' '}<strong>Settings → Account → API → Invite Codes</strong>{' '}
                    וצור Invite Code חדש. הכנס אותו כאן.
                  </p>

                  {inviteDone ? (
                    <div className="alert alert-success py-2 mb-0 d-flex align-items-center gap-2">
                      <CheckCircle size={16} />
                      <span>
                        טוקנים נשמרו בהצלחה
                        {tokenExpiry != null && (
                          <span className="text-muted ms-2 small">
                            (תוקף: {Math.round(tokenExpiry / 3600)} שעות)
                          </span>
                        )}
                      </span>
                    </div>
                  ) : (
                    <form onSubmit={handleInviteSubmit}>
                      {inviteError && (
                        <div className="alert alert-danger py-2 small mb-3">{inviteError}</div>
                      )}
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Invite Code</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="הכנס את ה-Invite Code מ-Beds24"
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value)}
                          required
                          dir="ltr"
                          style={{ letterSpacing: 1 }}
                        />
                      </div>
                      <button
                        type="submit"
                        className="btn btn-primary fw-bold"
                        style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none' }}
                        disabled={inviteLoading || !inviteCode.trim()}
                      >
                        {inviteLoading
                          ? <><Loader2 size={14} className="spin me-2" />מחליף...</>
                          : 'חבר ושמור טוקנים'}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* ── Step 2: Property + Room IDs ── */}
              <div className={`step-card ${steps.ids}`}>
                <div className="step-header">
                  <Database size={18} style={{ color: steps.ids === 'done' ? '#15803d' : '#667eea', flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>שלב 2 — Property ID + Room ID</span>
                  {stepBadge(steps.ids, steps.ids === 'done' ? 'הושלם' : steps.ids === 'error' ? 'שגיאה' : steps.ids === 'pending' ? 'ממתין לשלב 1' : 'ממתין')}
                </div>
                <div className="step-body">
                  <p className="text-muted small mb-3">
                    ב-Beds24 (בחשבון-המשנה של הלקוח):
                    <br />
                    <strong>Property ID</strong> — Settings → Property → General
                    <br />
                    <strong>Room ID</strong> — Settings → Rooms → סמן את החדר
                  </p>

                  {idsDone ? (
                    <div className="alert alert-success py-2 mb-0 d-flex align-items-center gap-2">
                      <CheckCircle size={16} />
                      <span>Property {propertyId} / Room {roomId} נשמרו</span>
                    </div>
                  ) : (
                    <form onSubmit={handleIdsSubmit}>
                      {idsError && (
                        <div className="alert alert-danger py-2 small mb-3">{idsError}</div>
                      )}
                      <div className="row g-3 mb-3">
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">Property ID <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="326842"
                            value={propertyId}
                            onChange={(e) => setPropertyId(e.target.value)}
                            required
                            disabled={!inviteDone}
                            dir="ltr"
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">Room ID <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="678098"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            required
                            disabled={!inviteDone}
                            dir="ltr"
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label fw-semibold">שם החדר <span className="text-muted fw-normal small">(אופציונלי — יוצג בדשבורד)</span></label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="לדוגמה: וילה ים"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            disabled={!inviteDone}
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="btn btn-primary fw-bold"
                        style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none' }}
                        disabled={idsLoading || !inviteDone || !propertyId.trim() || !roomId.trim()}
                      >
                        {idsLoading
                          ? <><Loader2 size={14} className="spin me-2" />שומר...</>
                          : 'שמור IDs'}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* ── Step 3: Seed Cache ── */}
              <div className={`step-card ${steps.cache}`}>
                <div className="step-header">
                  <Server size={18} style={{ color: steps.cache === 'done' ? '#15803d' : '#667eea', flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>שלב 3 — אתחול Cache זמינות</span>
                  {stepBadge(steps.cache, steps.cache === 'done' ? 'הושלם' : steps.cache === 'error' ? 'שגיאה' : steps.cache === 'pending' ? 'ממתין לשלב 2' : 'ממתין')}
                </div>
                <div className="step-body">
                  <p className="text-muted small mb-3">
                    טוען את נתוני הזמינות והמחירים מ-Beds24 לבסיס הנתונים שלנו.
                    הדשבורד של הלקוח יהיה מוכן מיד לאחר מכן.
                  </p>

                  {cacheDone ? (
                    <div className="alert alert-success py-2 mb-0 d-flex align-items-center gap-2">
                      <CheckCircle size={16} />
                      <span>
                        Cache אותחל בהצלחה
                        {cachedDays != null && (
                          <span className="text-muted ms-2 small">({cachedDays} ימים נשמרו)</span>
                        )}
                      </span>
                    </div>
                  ) : (
                    <>
                      {cacheError && (
                        <div className="alert alert-danger py-2 small mb-3">{cacheError}</div>
                      )}
                      <button
                        type="button"
                        className="btn btn-primary fw-bold"
                        style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none' }}
                        disabled={cacheLoading || !idsDone}
                        onClick={handleSeedCache}
                      >
                        {cacheLoading
                          ? <><Loader2 size={14} className="spin me-2" />טוען...</>
                          : 'אתחל Cache'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* ── All done ── */}
              {allDone && (
                <div
                  className="card border-0 shadow"
                  style={{ borderRadius: 12, background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px solid #86efac' }}
                >
                  <div className="card-body p-4 text-center">
                    <CheckCircle size={40} style={{ color: '#15803d', marginBottom: 12 }} />
                    <h5 className="fw-bold mb-2" style={{ color: '#15803d' }}>הגדרת Beds24 הושלמה!</h5>
                    <p className="text-muted small mb-3">
                      חשבון הלקוח מחובר ל-Beds24 עם tokens, Property ID, Room ID וה-Cache מוכן.
                    </p>
                    <div className="d-flex gap-2 justify-content-center flex-wrap">
                      <Link href={`/admin/users/${userId}/airbnb-setup`}>
                        <button
                          type="button"
                          className="btn btn-sm fw-bold"
                          style={{ background: '#ff5a5f', color: 'white', border: 'none' }}
                        >
                          חיבור Airbnb ←
                        </button>
                      </Link>
                      <Link href="/admin/users">
                        <button type="button" className="btn btn-sm btn-outline-secondary fw-bold">
                          חזרה לרשימת משתמשים
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  )
}
