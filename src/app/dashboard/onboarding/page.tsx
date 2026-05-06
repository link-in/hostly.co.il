'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Check, ExternalLink, Loader2, Copy, RefreshCw, Download, AlertCircle } from 'lucide-react'

type StepStatus = 'pending' | 'active' | 'done'

interface AirbnbUser {
  userId: string
  firstName?: string
}

interface AirbnbListing {
  listingId: string
  name?: string
  address?: string
}

export default function OnboardingPage() {
  const { data: session, update } = useSession()
  const router = useRouter()

  // ── Step 1: Connect Airbnb ───────────────────────────────────────────────────
  const [airbnbLinking, setAirbnbLinking] = useState(false)
  const [airbnbUrl, setAirbnbUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [airbnbError, setAirbnbError] = useState<string | null>(null)

  // Step 1b: Verify + detect new user
  const [verifying, setVerifying] = useState(false)
  const [knownUserIds, setKnownUserIds] = useState<string[]>([])
  const [newAirbnbUser, setNewAirbnbUser] = useState<AirbnbUser | null>(null)

  // Step 1c: Select listing + import
  const [loadingListings, setLoadingListings] = useState(false)
  const [listings, setListings] = useState<AirbnbListing[]>([])
  const [selectedListingId, setSelectedListingId] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [airbnbDone, setAirbnbDone] = useState(false)

  // Property data resolved (from Airbnb import OR manual fallback)
  const [propertyId, setPropertyId] = useState('')
  const [roomId, setRoomId] = useState('')

  // ── Channel selection ────────────────────────────────────────────────────────
  type ChannelChoice = 'airbnb' | 'booking' | 'manual' | null
  const [channelChoice, setChannelChoice] = useState<ChannelChoice>(null)
  const [propertyName, setPropertyName] = useState('')
  const [creatingProperty, setCreatingProperty] = useState(false)
  const [propertyError, setPropertyError] = useState<string | null>(null)

  // Sync property name from session once it loads (session may be null on first render)
  useEffect(() => {
    if (session?.user?.displayName && !propertyName) {
      setPropertyName(session.user.displayName)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.displayName])

  // Read registration credentials from sessionStorage and clear immediately
  const [regPassword, setRegPassword] = useState('')
  const [pwCopied, setPwCopied] = useState(false)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('hostly_reg_creds')
      if (raw) {
        const { password } = JSON.parse(raw)
        setRegPassword(password ?? '')
        sessionStorage.removeItem('hostly_reg_creds')
      }
    } catch { /* ignore */ }
  }, [])

  // ── Step 2: Connect Booking.com ─────────────────────────────────────────────
  const [bookingLinking, setBookingLinking] = useState(false)
  const [bookingUrl, setBookingUrl] = useState<string | null>(null)
  const [bookingCopied, setBookingCopied] = useState(false)
  const [bookingDone, setBookingDone] = useState(false)

  // ── Step 3: Save & enter ─────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const step: 1 | 2 | 3 = !airbnbDone ? 1 : !bookingDone ? 2 : 3

  const stepStatus = (n: 1 | 2 | 3): StepStatus => {
    if (n < step) return 'done'
    if (n === step) return 'active'
    return 'pending'
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleConnectAirbnb = async () => {
    setAirbnbError(null)
    setAirbnbUrl(null)
    setNewAirbnbUser(null)
    setListings([])
    setAirbnbLinking(true)
    try {
      // Snapshot existing users BEFORE opening OAuth
      const usersRes = await fetch('/api/dashboard/beds24/airbnb-users')
      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setKnownUserIds((usersData.users ?? []).map((u: AirbnbUser) => String(u.userId)))
      }

      // Get OAuth URL (no propertyId needed — import creates its own property)
      const res = await fetch('/api/dashboard/beds24/airbnb-auth-url')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'שגיאה')
      setAirbnbUrl(data.url)
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setAirbnbError(err instanceof Error ? err.message : 'שגיאה')
    } finally {
      setAirbnbLinking(false)
    }
  }

  const handleVerifyConnection = async () => {
    setVerifying(true)
    setAirbnbError(null)
    try {
      const res = await fetch('/api/dashboard/beds24/airbnb-users')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'שגיאה')

      const allUsers: AirbnbUser[] = data.users ?? []
      const newUser = allUsers.find(u => !knownUserIds.includes(String(u.userId)))

      if (!newUser) {
        setAirbnbError('החיבור לא זוהה עדיין. אשר את הגישה ב-Airbnb ונסה שוב.')
        return
      }

      setNewAirbnbUser(newUser)
      await handleFetchListings(String(newUser.userId))
    } catch (err) {
      setAirbnbError(err instanceof Error ? err.message : 'שגיאה')
    } finally {
      setVerifying(false)
    }
  }

  const handleFetchListings = async (userId: string) => {
    setLoadingListings(true)
    try {
      const res = await fetch(`/api/dashboard/beds24/airbnb-listings?airbnbUserId=${userId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'שגיאה')
      const fetched: AirbnbListing[] = data.listings ?? []
      setListings(fetched)
      if (fetched.length === 1) setSelectedListingId(String(fetched[0].listingId))
    } catch (err) {
      setAirbnbError(err instanceof Error ? err.message : 'שגיאה')
    } finally {
      setLoadingListings(false)
    }
  }

  const handleImportListing = async () => {
    if (!newAirbnbUser || !selectedListingId) return
    setImportError(null)
    setImporting(true)
    try {
      const res = await fetch('/api/dashboard/beds24/airbnb-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'importAsNewProperty',
          airbnbUserId: String(newAirbnbUser.userId),
          airbnbListingId: selectedListingId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'שגיאת ייבוא')

      // Store the auto-created propertyId + roomId from Beds24
      setPropertyId(String(data.propertyId ?? ''))
      setRoomId(String(data.roomId ?? ''))
      setAirbnbDone(true)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'שגיאה')
    } finally {
      setImporting(false)
    }
  }

  // Manual fallback: create property + room without Airbnb
  const handleCreateManual = async () => {
    setPropertyError(null)
    if (!propertyName.trim()) { setPropertyError('יש להזין שם נכס'); return }
    setCreatingProperty(true)
    try {
      const res = await fetch('/api/dashboard/beds24/create-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: propertyName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'שגיאה')
    setPropertyId(String(data.propertyId))
    setRoomId(String(data.roomId ?? ''))
    setAirbnbDone(true)
    // Skip Booking.com step for self-management users
    if (channelChoice === 'manual') setBookingDone(true)
    } catch (err) {
      setPropertyError(err instanceof Error ? err.message : 'שגיאה')
    } finally {
      setCreatingProperty(false)
    }
  }

  const handleConnectBooking = async () => {
    setBookingLinking(true)
    try {
      const res = await fetch('/api/dashboard/beds24/booking-auth-url')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'שגיאה')
      setBookingUrl(data.url)
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } finally {
      setBookingLinking(false)
    }
  }

  const handleSave = async () => {
    setSaveError(null)
    setSaving(true)
    try {
      const body: Record<string, string> = {}
      if (propertyId) body.propertyId = propertyId
      if (roomId) body.roomId = roomId

      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'שגיאה בשמירה')
      await update({ propertyId: propertyId || undefined, roomId: roomId || undefined })
      await new Promise(resolve => setTimeout(resolve, 500))
      router.push('/dashboard')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'שגיאה')
    } finally {
      setSaving(false)
    }
  }

  // ── UI helpers ────────────────────────────────────────────────────────────────
  const StepBadge = ({ n, status }: { n: number; status: StepStatus }) => (
    <div style={{
      width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0,
      background: status === 'done' ? '#059669' : status === 'active' ? 'linear-gradient(135deg,#667eea,#764ba2)' : '#e5e7eb',
      color: status === 'pending' ? '#9ca3af' : 'white',
    }}>
      {status === 'done' ? <Check size={16} /> : n}
    </div>
  )

  return (
    <main dir="rtl" style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%)', display: 'flex', flexDirection: 'column' }}>
      <style>{`.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Top header bar */}
      <div style={{
        background: 'rgba(255,255,255,0.12)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.18)',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>הגדרת חשבון</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>Hostly</span>
          <div style={{ width: 36, height: 36, borderRadius: 10, overflow: 'hidden', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/photos/hostly-logo.png" alt="Hostly" width={28} height={28} style={{ objectFit: 'contain' }} />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 20px' }}>
      <div style={{ width: '100%', maxWidth: '580px' }}>
        {/* Welcome text */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ color: 'white', fontSize: '1.7rem', fontWeight: 700, margin: '0 0 6px' }}>ברוך הבא ל-Hostly!</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: 15 }}>
            שלושה שלבים קצרים ואתה מוכן לנהל את הנכס שלך
          </p>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
          {/* Progress bar */}
          <div style={{ height: 4, background: '#e5e7eb' }}>
            <div style={{ height: '100%', width: `${((step - 1) / 2) * 100}%`, background: 'linear-gradient(90deg,#667eea,#764ba2)', transition: 'width .4s ease' }} />
          </div>

          <div style={{ padding: '32px 36px' }}>

            {/* ── STEP 1: Airbnb ── */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <StepBadge n={1} status={stepStatus(1)} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>הגדרת נכס</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>ייבוא מ-Airbnb או יצירה ידנית</div>
                </div>
              </div>

              {step === 1 && (
                <div style={{ marginRight: 48 }}>

                  {/* Channel selector cards */}
                  {!airbnbUrl && !newAirbnbUser && (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                        {(
                          [
                            { value: 'airbnb', label: 'יש לי חשבון Airbnb', sub: 'ייבוא אוטומטי של הנכס', color: '#ff5a5f', bg: '#fff5f5' },
                            { value: 'booking', label: 'יש לי חשבון Booking.com', sub: 'יצירת נכס + חיבור ידני', color: '#003580', bg: '#f0f4ff' },
                            { value: 'manual', label: 'ניהול עצמי / ללא ערוץ', sub: 'רק הזמנות ישירות', color: '#374151', bg: '#f9fafb' },
                          ] as { value: ChannelChoice; label: string; sub: string; color: string; bg: string }[]
                        ).map(opt => (
                          <label key={opt.value} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                            border: `2px solid ${channelChoice === opt.value ? opt.color : '#e5e7eb'}`,
                            background: channelChoice === opt.value ? opt.bg : 'white',
                            transition: 'all .15s',
                          }}>
                            <input type="radio" name="channel" value={opt.value ?? ''}
                              checked={channelChoice === opt.value}
                              onChange={() => setChannelChoice(opt.value)}
                              style={{ accentColor: opt.color, width: 16, height: 16, flexShrink: 0 }} />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{opt.label}</div>
                              <div style={{ fontSize: 12, color: '#6b7280' }}>{opt.sub}</div>
                            </div>
                          </label>
                        ))}
                      </div>

                      {/* Action button based on selection */}
                      {channelChoice === 'airbnb' && (
                        <button type="button" className="btn fw-bold w-100 d-flex align-items-center justify-content-center gap-2"
                          style={{ background: '#ff5a5f', color: 'white', border: 'none', padding: '10px' }}
                          disabled={airbnbLinking} onClick={handleConnectAirbnb}>
                          {airbnbLinking ? <><Loader2 size={14} className="spin" /> מייצר קישור...</> : <><ExternalLink size={14} /> חבר ויבא מ-Airbnb</>}
                        </button>
                      )}

                      {channelChoice === 'booking' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <input type="text" className="form-control" placeholder="שם הנכס"
                            value={propertyName} onChange={e => setPropertyName(e.target.value)}
                            disabled={creatingProperty} />
                          <button type="button" className="btn fw-bold d-flex align-items-center justify-content-center gap-2"
                            style={{ background: '#003580', color: 'white', border: 'none', padding: '10px' }}
                            disabled={creatingProperty} onClick={handleCreateManual}>
                            {creatingProperty ? <><Loader2 size={14} className="spin" /> יוצר נכס...</> : 'צור נכס והמשך לחיבור Booking.com'}
                          </button>
                          {propertyError && <div className="alert alert-danger py-2 small mb-0">{propertyError}</div>}
                        </div>
                      )}

                      {channelChoice === 'manual' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <input type="text" className="form-control" placeholder="שם הנכס"
                            value={propertyName} onChange={e => setPropertyName(e.target.value)}
                            disabled={creatingProperty} />
                          <button type="button" className="btn fw-bold d-flex align-items-center justify-content-center gap-2"
                            style={{ background: '#374151', color: 'white', border: 'none', padding: '10px' }}
                            disabled={creatingProperty} onClick={handleCreateManual}>
                            {creatingProperty ? <><Loader2 size={14} className="spin" /> יוצר נכס...</> : 'צור נכס'}
                          </button>
                          {propertyError && <div className="alert alert-danger py-2 small mb-0">{propertyError}</div>}
                        </div>
                      )}

                      {airbnbError && <div className="alert alert-warning mt-2 py-2 small">{airbnbError}</div>}
                    </>
                  )}

                  {/* 1b — URL open, waiting for user to auth */}
                  {airbnbUrl && !newAirbnbUser && (
                    <div style={{ padding: '14px 16px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#c2410c', marginBottom: 8 }}>
                        ✦ אשר את הגישה ב-Airbnb, ואז לחץ על הכפתור למטה
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        <input readOnly className="form-control form-control-sm" value={airbnbUrl} style={{ fontSize: 11, direction: 'ltr' }} />
                        <button type="button" className="btn btn-sm" style={{ background: copied ? '#059669' : '#374151', color: 'white', border: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
                          onClick={async () => { await navigator.clipboard.writeText(airbnbUrl); setCopied(true); setTimeout(() => setCopied(false), 2500) }}>
                          {copied ? <><Check size={12} /> הועתק</> : <><Copy size={12} /> העתק</>}
                        </button>
                        <button type="button" className="btn btn-sm" style={{ background: '#ff5a5f', color: 'white', border: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
                          onClick={() => window.open(airbnbUrl, '_blank', 'noopener,noreferrer')}>
                          <ExternalLink size={12} /> פתח
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-sm fw-bold d-flex align-items-center gap-2"
                          style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', color: 'white', border: 'none' }}
                          disabled={verifying} onClick={handleVerifyConnection}>
                          {verifying ? <><Loader2 size={13} className="spin" /> בודק...</> : <><RefreshCw size={13} /> אישרתי ב-Airbnb</>}
                        </button>
                        <button type="button" className="btn btn-outline-secondary btn-sm"
                          onClick={() => { setAirbnbUrl(null); setAirbnbError(null); setChannelChoice('manual') }}>
                          דלג — צור נכס ידנית
                        </button>
                      </div>
                      {airbnbError && <div className="alert alert-warning mt-2 py-2 small mb-0">{airbnbError}</div>}
                    </div>
                  )}

                  {/* 1c — New user detected, select & import listing */}
                  {newAirbnbUser && !airbnbDone && (
                    <div style={{ padding: '14px 16px', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#059669', marginBottom: 10 }}>
                        ✓ Airbnb מחובר: {newAirbnbUser.firstName ?? newAirbnbUser.userId}
                      </div>

                      {loadingListings && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6b7280', fontSize: 13 }}>
                          <Loader2 size={14} className="spin" /> טוען נכסים מ-Airbnb...
                        </div>
                      )}

                      {!loadingListings && listings.length === 0 && (
                        <div className="alert alert-warning py-2 small mb-2">לא נמצאו נכסים בחשבון.</div>
                      )}

                      {!loadingListings && listings.length > 0 && (
                        <>
                          <div style={{ fontSize: 13, color: '#374151', marginBottom: 8, fontWeight: 500 }}>
                            בחר נכס לייבוא:
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                            {listings.map(listing => (
                              <label key={listing.listingId} style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                                border: `2px solid ${selectedListingId === String(listing.listingId) ? '#667eea' : '#e5e7eb'}`,
                                borderRadius: 8, cursor: 'pointer',
                                background: selectedListingId === String(listing.listingId) ? '#f0f0ff' : 'white',
                              }}>
                                <input type="radio" name="listing" value={String(listing.listingId)}
                                  checked={selectedListingId === String(listing.listingId)}
                                  onChange={e => setSelectedListingId(e.target.value)}
                                  style={{ accentColor: '#667eea' }} />
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 13 }}>{listing.name ?? `נכס ${listing.listingId}`}</div>
                                  {listing.address && <div style={{ fontSize: 11, color: '#6b7280' }}>{listing.address}</div>}
                                </div>
                              </label>
                            ))}
                          </div>

                          <button
                            type="button"
                            className="btn fw-bold d-flex align-items-center gap-2"
                            style={{ background: '#059669', color: 'white', border: 'none' }}
                            disabled={!selectedListingId || importing}
                            onClick={handleImportListing}
                          >
                            {importing
                              ? <><Loader2 size={14} className="spin" /> מייבא מ-Airbnb...</>
                              : <><Download size={14} /> ייבא נכס מ-Airbnb</>}
                          </button>

                          {importError && <div className="alert alert-danger mt-2 py-2 small mb-0">{importError}</div>}
                        </>
                      )}
                    </div>
                  )}

                  {!airbnbUrl && airbnbError && (
                    <div className="alert alert-warning mt-2 py-2 small">{airbnbError}</div>
                  )}
                </div>
              )}


              {stepStatus(1) === 'done' && (
                <div style={{ marginRight: 48, fontSize: 14, fontWeight: 600 }}>
                  {propertyId ? (
                    <span style={{ color: '#059669' }}>
                      ✓ נכס מוכן{propertyId && ` · ID: ${propertyId}`}
                    </span>
                  ) : (
                    <span style={{ color: '#9ca3af' }}>⏭ דולג</span>
                  )}
                </div>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '0 0 28px' }} />

            {/* ── STEP 2: Booking.com ── */}
            <div style={{ marginBottom: 28, opacity: step < 2 ? 0.4 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <StepBadge n={2} status={stepStatus(2)} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>חיבור חשבון Booking.com</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>מקשר את הנכס שלך ל-Booking.com דרך Beds24</div>
                </div>
              </div>

              {step === 2 && (
                <div style={{ marginRight: 48 }}>
                  <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, marginBottom: 12 }}>
                    <AlertCircle size={15} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
                      <strong>שים לב:</strong> לאחר חיבור, מיפוי החדרים דורש פעולה ידנית ב-Beds24 → Channels → Booking.com → Map rooms.
                    </div>
                  </div>

                  {!bookingUrl ? (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button type="button" className="btn fw-bold d-flex align-items-center gap-2"
                        style={{ background: '#003580', color: 'white', border: 'none' }}
                        disabled={bookingLinking} onClick={handleConnectBooking}>
                        {bookingLinking ? <><Loader2 size={14} className="spin" /> ...</> : <><ExternalLink size={14} /> חבר Booking.com</>}
                      </button>
                      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setBookingDone(true)}>
                        דלג — אחבר מאוחר יותר
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: '14px 16px', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8', marginBottom: 8 }}>
                        ✦ פתח את הקישור והתחבר עם חשבון Booking.com שלך
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        <input readOnly className="form-control form-control-sm" value={bookingUrl} style={{ fontSize: 11, direction: 'ltr' }} />
                        <button type="button" className="btn btn-sm"
                          style={{ background: bookingCopied ? '#059669' : '#374151', color: 'white', border: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
                          onClick={async () => { await navigator.clipboard.writeText(bookingUrl); setBookingCopied(true); setTimeout(() => setBookingCopied(false), 2500) }}>
                          {bookingCopied ? <><Check size={12} /> הועתק</> : <><Copy size={12} /> העתק</>}
                        </button>
                        <button type="button" className="btn btn-sm"
                          style={{ background: '#003580', color: 'white', border: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
                          onClick={() => window.open(bookingUrl, '_blank', 'noopener,noreferrer')}>
                          <ExternalLink size={12} /> פתח
                        </button>
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
                        לאחר החיבור, יש למפות חדרים ידנית ב-Beds24 →{' '}
                        <a href="https://beds24.com/control3.php?pagetype=channels" target="_blank" rel="noreferrer" style={{ color: '#003580' }}>
                          פתח Beds24 Channels
                        </a>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="btn btn-sm fw-bold"
                          style={{ background: '#059669', color: 'white', border: 'none' }}
                          onClick={() => setBookingDone(true)}>
                          ✓ חיברתי — המשך
                        </button>
                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setBookingDone(true)}>
                          דלג
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {stepStatus(2) === 'done' && (
                <div style={{ marginRight: 48, color: bookingUrl ? '#059669' : '#9ca3af', fontSize: 14, fontWeight: 600 }}>
                  {bookingUrl ? '✓ Booking.com מחובר (מיפוי חדרים נדרש ב-Beds24)' : '⏭ דולג — ניתן לחבר בהמשך'}
                </div>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '0 0 28px' }} />

            {/* ── STEP 3: Enter ── */}
            <div style={{ opacity: step < 3 ? 0.4 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <StepBadge n={3} status={stepStatus(3)} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>כניסה למערכת</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>שמור את ההגדרות והתחל לנהל</div>
                </div>
              </div>

              {step === 3 && (
                <div style={{ marginRight: 48 }}>
                  {/* Credentials reminder — only shown when password is available from registration */}
                  {regPassword && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
                        💾 שמור את פרטי הכניסה שלך
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: '#6b7280', width: 52, flexShrink: 0 }}>אימייל:</span>
                          <input readOnly value={session?.user?.email ?? ''}
                            style={{ flex: 1, fontSize: 13, direction: 'ltr', padding: '5px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', color: '#111827' }} />
                          <button type="button" className="btn btn-sm"
                            style={{ background: '#374151', color: 'white', border: 'none', flexShrink: 0, fontSize: 12 }}
                            onClick={async () => { await navigator.clipboard.writeText(session?.user?.email ?? ''); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>
                            {copied ? <><Check size={11} /> הועתק</> : <><Copy size={11} /> העתק</>}
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: '#6b7280', width: 52, flexShrink: 0 }}>סיסמה:</span>
                          <input readOnly type="text" value={regPassword}
                            style={{ flex: 1, fontSize: 13, direction: 'ltr', padding: '5px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', color: '#111827' }} />
                          <button type="button" className="btn btn-sm"
                            style={{ background: '#374151', color: 'white', border: 'none', flexShrink: 0, fontSize: 12 }}
                            onClick={async () => { await navigator.clipboard.writeText(regPassword); setPwCopied(true); setTimeout(() => setPwCopied(false), 2000) }}>
                            {pwCopied ? <><Check size={11} /> הועתק</> : <><Copy size={11} /> העתק</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {saveError && <div className="alert alert-danger py-2 small mb-3">{saveError}</div>}
                  <button type="button" className="btn fw-bold px-4"
                    style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', color: 'white', border: 'none', fontSize: 16 }}
                    disabled={saving} onClick={handleSave}>
                    {saving ? <><Loader2 size={16} className="spin me-2" />שומר...</> : '🚀 כנס לדשבורד'}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
      </div>
    </main>
  )
}
