'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { CheckCircle, AlertCircle, Loader2, ChevronRight, Key, Calendar, Home, Users, GitMerge, Plus } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AirbnbUser {
  userId: string
  userName?: string
  email?: string
  [key: string]: unknown
}

interface AirbnbListing {
  listingId: string
  name?: string
  address?: string
  picture?: string
  [key: string]: unknown
}

/** 'import' = Beds24 creates a new property from Airbnb listing
 *  'connect' = connects Airbnb listing to an already-existing Beds24 room */
type Mode = 'import' | 'connect'

type Step =
  | 'choose-mode'
  | 'select-user'
  | 'select-listing'
  | 'confirm'
  | 'running'
  | 'done'
  | 'error'

interface SetupResult {
  propertyId: string
  roomId: string
  apiKey: string
  cachedDays: number
  cacheWarning: string | null
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const FLOW_STEPS = [
  { key: 'select-user',    label: 'Airbnb User' },
  { key: 'select-listing', label: 'נכס' },
  { key: 'confirm',        label: 'אישור' },
  { key: 'done',           label: 'הצלחה' },
]

function StepDots({ current }: { current: Step }) {
  const idx = FLOW_STEPS.findIndex((s) => s.key === current)
  if (idx < 0) return null
  return (
    <div className="d-flex justify-content-center gap-2 mb-4">
      {FLOW_STEPS.map((s, i) => (
        <div
          key={s.key}
          title={s.label}
          style={{
            width: 32, height: 32,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700,
            background: i < idx
              ? 'linear-gradient(135deg,#10b981,#059669)'
              : i === idx
                ? 'linear-gradient(135deg,#667eea,#764ba2)'
                : '#e5e7eb',
            color: i <= idx ? 'white' : '#9ca3af',
            transition: 'all .3s',
          }}
        >
          {i < idx ? '✓' : i + 1}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AirbnbSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = use(params)

  const [mode, setMode]                     = useState<Mode>('import')
  const [step, setStep]                     = useState<Step>('choose-mode')

  const [loadingUsers, setLoadingUsers]     = useState(false)
  const [users, setUsers]                   = useState<AirbnbUser[]>([])
  const [selectedUser, setSelectedUser]     = useState<AirbnbUser | null>(null)

  const [loadingListings, setLoadingListings] = useState(false)
  const [listings, setListings]             = useState<AirbnbListing[]>([])
  const [selectedListing, setSelectedListing] = useState<AirbnbListing | null>(null)

  // "connect" mode: existing Beds24 room ID
  const [existingRoomId, setExistingRoomId] = useState('')
  const [existingPropertyId, setExistingPropertyId] = useState('')

  const [running, setRunning]               = useState(false)
  const [result, setResult]                 = useState<SetupResult | null>(null)
  const [errorMsg, setErrorMsg]             = useState<string | null>(null)
  const [userEmail, setUserEmail]           = useState('')

  // Load target user email
  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((data) => {
        const found = (data.users ?? []).find((u: { id: string; email: string; propertyId?: string; roomId?: string }) => u.id === userId)
        if (found) {
          setUserEmail(found.email)
          if (found.propertyId) setExistingPropertyId(String(found.propertyId))
          if (found.roomId) setExistingRoomId(String(found.roomId).split(',')[0].split(':')[0].trim())
        }
      })
      .catch(() => {})
  }, [userId])

  // Load Airbnb users from master Beds24 account
  const loadAirbnbUsers = () => {
    setLoadingUsers(true)
    fetch('/api/dashboard/beds24/airbnb-users')
      .then((r) => r.json())
      .then((data) => {
        const rawUsers = data.users ?? []
        const normalised: AirbnbUser[] = rawUsers.map((u: Record<string, unknown>) => {
          const uid = String(u.airbnbUserId ?? u.userId ?? u.id ?? '')
          const uname = String(u.firstName ?? u.userName ?? u.name ?? u.email ?? uid)
          return { ...u, userId: uid, userName: uname }
        })
        setUsers(normalised.filter((u) => u.userId))
        setStep('select-user')
      })
      .catch(() => {
        setErrorMsg('שגיאה בטעינת משתמשי Airbnb מ-Beds24')
        setStep('error')
      })
      .finally(() => setLoadingUsers(false))
  }

  const handleChooseMode = (chosen: Mode) => {
    setMode(chosen)
    setSelectedUser(null)
    setSelectedListing(null)
    setErrorMsg(null)
    loadAirbnbUsers()
  }

  // Load listings when Airbnb user is selected
  const handleSelectUser = async (user: AirbnbUser) => {
    setSelectedUser(user)
    setSelectedListing(null)
    setListings([])
    setLoadingListings(true)
    setStep('select-listing')
    try {
      const res = await fetch(`/api/dashboard/beds24/airbnb-listings?airbnbUserId=${user.userId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'שגיאה')
      const rawListings = data.listings ?? []
      const normalised: AirbnbListing[] = rawListings.map((l: Record<string, unknown>) => {
        const lid = String(l.airbnbListingId ?? l.listingId ?? l.id ?? '')
        const pd = l.publicDescription as Record<string, unknown> | undefined
        const lname = String(
          l.name ?? l.nickname ?? l.title ?? l.listingName ?? l.listingTitle ??
          pd?.name ?? pd?.summary ?? `נכס ${lid}`
        )
        const address = String(l.address ?? l.city ?? l.location ?? l.neighborhood ?? '')
        const picture = String(l.picture ?? l.photo ?? l.thumbnail ?? l.listingPicture ?? '')
        return { ...l, listingId: lid, name: lname, address, picture }
      })
      setListings(normalised.filter((l) => l.listingId))
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'שגיאה בטעינת נכסים')
      setStep('error')
    } finally {
      setLoadingListings(false)
    }
  }

  const handleSelectListing = (listing: AirbnbListing) => {
    setSelectedListing(listing)
    setStep('confirm')
  }

  // Run the full setup
  const handleRun = async () => {
    if (!selectedUser || !selectedListing) return
    if (mode === 'connect' && (!existingRoomId.trim() || !existingPropertyId.trim())) {
      setErrorMsg('נדרש Room ID ו-Property ID קיימים עבור מצב "חבר לחדר קיים"')
      return
    }
    setRunning(true)
    setStep('running')
    try {
      const res = await fetch(`/api/admin/users/${userId}/airbnb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          airbnbUserId: selectedUser.userId,
          airbnbListingId: selectedListing.listingId,
          listingName: selectedListing.name || undefined,
          ...(mode === 'connect' && {
            existingRoomId: existingRoomId.trim(),
            existingPropertyId: existingPropertyId.trim(),
          }),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'שגיאה לא ידועה')
      setResult(data as SetupResult)
      setStep('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'שגיאה')
      setStep('error')
    } finally {
      setRunning(false)
    }
  }

  const reset = () => {
    setStep('choose-mode')
    setSelectedUser(null)
    setSelectedListing(null)
    setResult(null)
    setErrorMsg(null)
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: 16,
    boxShadow: '0 8px 32px rgba(102,126,234,0.15)',
    overflow: 'hidden',
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%)' }}>
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-6">
            <div style={cardStyle}>

              {/* Header */}
              <div style={{ background: 'linear-gradient(135deg,#FF5A5F,#FF9A9E)', padding: '1.5rem', color: 'white' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h1 className="h4 mb-1 fw-bold">
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/6/69/Airbnb_Logo_Bélo.svg"
                        alt="Airbnb" width={20} style={{ marginLeft: 8, verticalAlign: 'middle' }}
                      />
                      הגדרת Airbnb ידני
                    </h1>
                    {userEmail && <small className="opacity-75">{userEmail}</small>}
                  </div>
                  <Link href={`/admin/users/${userId}/edit`}>
                    <button className="btn btn-light btn-sm">← חזרה לעריכה</button>
                  </Link>
                </div>
              </div>

              <div className="p-4">

                {/* Step dots (not shown in choose-mode / running / done / error) */}
                {['select-user','select-listing','confirm'].includes(step) && (
                  <StepDots current={step} />
                )}

                {/* ── CHOOSE MODE ─────────────────────────────────── */}
                {step === 'choose-mode' && (
                  <div>
                    <h6 className="fw-bold mb-1">מה המצב?</h6>
                    <p className="text-muted small mb-4">
                      בחר לפי מה שרואים ב-Beds24 → Channel Manager → Airbnb
                    </p>

                    {/* Option A: import */}
                    <button
                      type="button"
                      className="w-100 btn text-start mb-3 d-flex align-items-start gap-3 p-3"
                      style={{ border: '2px solid #e5e7eb', borderRadius: 12, transition: 'all .2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#667eea'; e.currentTarget.style.background = '#f8f9ff' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white' }}
                      onClick={() => handleChooseMode('import')}
                      disabled={loadingUsers}
                    >
                      <div style={{ background: '#eef2ff', borderRadius: 8, padding: 8, flexShrink: 0 }}>
                        <Plus size={20} color="#667eea" />
                      </div>
                      <div>
                        <div className="fw-bold" style={{ fontSize: 14 }}>ייבא כנכס חדש</div>
                        <div className="text-muted" style={{ fontSize: 12 }}>
                          Beds24 יצור Property + Room חדשים אוטומטית מתוך נכס ה-Airbnb.
                          <br />
                          <span className="text-success">✓ מתאים כשאין עדיין חדר ב-Beds24</span>
                        </div>
                      </div>
                    </button>

                    {/* Option B: connect to existing room */}
                    <button
                      type="button"
                      className="w-100 btn text-start mb-3 d-flex align-items-start gap-3 p-3"
                      style={{ border: '2px solid #e5e7eb', borderRadius: 12, transition: 'all .2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#FF5A5F'; e.currentTarget.style.background = '#fff8f8' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white' }}
                      onClick={() => handleChooseMode('connect')}
                      disabled={loadingUsers}
                    >
                      <div style={{ background: '#fff1f2', borderRadius: 8, padding: 8, flexShrink: 0 }}>
                        <GitMerge size={20} color="#FF5A5F" />
                      </div>
                      <div>
                        <div className="fw-bold" style={{ fontSize: 14 }}>חבר לחדר קיים</div>
                        <div className="text-muted" style={{ fontSize: 12 }}>
                          קיים כבר חדר ב-Beds24 (כמו 679502) שמציג &quot;Not connected&quot;?
                          <br />
                          <span style={{ color: '#FF5A5F' }}>✓ מתאים למצב בצילום המסך שלך</span>
                        </div>
                      </div>
                    </button>

                    {/* Content errors warning */}
                    <div className="alert alert-warning d-flex gap-2 align-items-start" style={{ fontSize: 12 }}>
                      <span style={{ fontSize: 16 }}>⚠️</span>
                      <div>
                        <strong>שגיאות תוכן (Fix Content Errors)?</strong>
                        <br />
                        Airbnb דורש מידע מלא בנכס (תמונות, תיאור, מחיר, תנאים) לפני שמאפשר סנכרון.
                        הלקוח חייב לתקן זאת <strong>ב-Airbnb</strong> לפני שהחיבור יפעל.
                      </div>
                    </div>

                    {loadingUsers && (
                      <div className="text-center text-muted mt-2" style={{ fontSize: 12 }}>
                        <Loader2 size={14} style={{ animation: 'spin .8s linear infinite', marginLeft: 6 }} />
                        טוען משתמשי Airbnb...
                      </div>
                    )}
                  </div>
                )}

                {/* ── SELECT USER ──────────────────────────────────── */}
                {step === 'select-user' && (
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <div style={{ background: '#f0f4ff', borderRadius: 8, padding: '6px 10px' }}>
                        <Users size={18} color="#667eea" />
                      </div>
                      <div>
                        <h6 className="mb-0 fw-bold">שלב 1 — בחר משתמש Airbnb</h6>
                        <small className="text-muted">
                          מצב: <strong>{mode === 'import' ? 'ייבא חדש' : 'חבר לחדר קיים'}</strong>
                        </small>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-link btn-sm text-muted p-0 mb-3"
                      onClick={() => setStep('choose-mode')}
                    >
                      ← שנה מצב
                    </button>

                    {users.length === 0 ? (
                      <div className="alert alert-warning">
                        <strong>לא נמצאו משתמשי Airbnb.</strong>
                        <br />
                        <small>ודא שהלקוח חיבר את ה-Airbnb שלו דרך Beds24.</small>
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {users.map((user) => (
                          <button
                            key={user.userId}
                            type="button"
                            className="btn text-start d-flex align-items-center justify-content-between p-3"
                            style={{ border: '1.5px solid #e5e7eb', borderRadius: 10, transition: 'all .2s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#667eea'; e.currentTarget.style.background = '#f8f9ff' }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white' }}
                            onClick={() => handleSelectUser(user)}
                          >
                            <div>
                              <div className="fw-semibold" style={{ fontSize: 14 }}>{user.userName}</div>
                              <code style={{ fontSize: 11, color: '#6b7280' }}>{user.userId}</code>
                            </div>
                            <ChevronRight size={16} color="#9ca3af" style={{ transform: 'rotate(180deg)' }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── SELECT LISTING ───────────────────────────────── */}
                {step === 'select-listing' && (
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <div style={{ background: '#f0f4ff', borderRadius: 8, padding: '6px 10px' }}>
                        <Home size={18} color="#667eea" />
                      </div>
                      <div>
                        <h6 className="mb-0 fw-bold">שלב 2 — בחר נכס Airbnb</h6>
                        <small className="text-muted">משתמש: <strong>{selectedUser?.userName}</strong></small>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-link btn-sm text-muted p-0 mb-3"
                      onClick={() => setStep('select-user')}
                    >
                      ← שנה משתמש
                    </button>

                    {/* For "connect" mode — show room ID inputs */}
                    {mode === 'connect' && (
                      <div className="p-3 rounded-3 mb-3" style={{ background: '#fff8f8', border: '1px solid #fecaca' }}>
                        <div className="fw-semibold mb-2" style={{ fontSize: 13, color: '#dc2626' }}>
                          <GitMerge size={14} style={{ marginLeft: 4 }} />
                          פרטי החדר הקיים ב-Beds24
                        </div>
                        <div className="row g-2">
                          <div className="col-6">
                            <label className="form-label mb-1" style={{ fontSize: 12 }}>Property ID</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={existingPropertyId}
                              onChange={(e) => setExistingPropertyId(e.target.value)}
                              placeholder="306559"
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label mb-1" style={{ fontSize: 12 }}>Room ID</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={existingRoomId}
                              onChange={(e) => setExistingRoomId(e.target.value)}
                              placeholder="679502"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {loadingListings ? (
                      <div className="text-center py-4">
                        <Loader2 size={28} color="#667eea" style={{ animation: 'spin .8s linear infinite' }} />
                        <div className="text-muted mt-2">טוען נכסים מ-Airbnb...</div>
                      </div>
                    ) : listings.length === 0 ? (
                      <div className="alert alert-warning">
                        <strong>לא נמצאו נכסים.</strong>
                        <br />
                        <small>ייתכן שיש "Fix Content Errors" ב-Airbnb — הלקוח צריך לתקן ב-Airbnb תחילה.</small>
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {listings.map((listing) => (
                          <button
                            key={listing.listingId}
                            type="button"
                            className="btn text-start d-flex align-items-center gap-3 p-3"
                            style={{ border: '1.5px solid #e5e7eb', borderRadius: 10, transition: 'all .2s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#FF5A5F'; e.currentTarget.style.background = '#fff8f8' }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white' }}
                            onClick={() => handleSelectListing(listing)}
                          >
                            {listing.picture && (
                              <img
                                src={listing.picture}
                                alt=""
                                style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                                onError={(e) => { e.currentTarget.style.display = 'none' }}
                              />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="fw-semibold" style={{ fontSize: 14 }}>
                                {listing.name}
                              </div>
                              {listing.address && (
                                <div style={{ fontSize: 12, color: '#6b7280' }}>{listing.address as string}</div>
                              )}
                              <code style={{ fontSize: 11, color: '#9ca3af' }}>ID: {listing.listingId}</code>
                            </div>
                            <ChevronRight size={16} color="#9ca3af" style={{ flexShrink: 0, transform: 'rotate(180deg)' }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── CONFIRM ──────────────────────────────────────── */}
                {step === 'confirm' && (
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <div style={{ background: '#f0f4ff', borderRadius: 8, padding: '6px 10px' }}>
                        <Calendar size={18} color="#667eea" />
                      </div>
                      <div>
                        <h6 className="mb-0 fw-bold">שלב 3 — אישור</h6>
                        <small className="text-muted">בדוק ולחץ הגדר</small>
                      </div>
                    </div>

                    <div className="p-3 rounded-3 mb-3" style={{ background: '#f8f9ff', border: '1px solid #e0e4ff' }}>
                      <div className="mb-2">
                        <div className="text-muted small">מצב:</div>
                        <div className="fw-semibold" style={{ fontSize: 14 }}>
                          {mode === 'import'
                            ? '📥 ייבוא כנכס חדש ב-Beds24'
                            : '🔗 חיבור לחדר קיים'}
                        </div>
                      </div>
                      <hr style={{ borderColor: '#e0e4ff', margin: '8px 0' }} />
                      <div className="row g-2">
                        <div className="col-12">
                          <div className="text-muted small">משתמש Airbnb:</div>
                          <div className="fw-semibold">{selectedUser?.userName}</div>
                          <code style={{ fontSize: 11, color: '#6b7280' }}>{selectedUser?.userId}</code>
                        </div>
                        <div className="col-12">
                          <div className="text-muted small">נכס Airbnb:</div>
                          <div className="fw-semibold">{selectedListing?.name}</div>
                          <code style={{ fontSize: 11, color: '#6b7280' }}>ID: {selectedListing?.listingId}</code>
                        </div>
                        {mode === 'connect' && (
                          <div className="col-12">
                            <div className="text-muted small">חדר קיים ב-Beds24:</div>
                            <code style={{ fontSize: 11, color: '#dc2626' }}>
                              Property: {existingPropertyId} | Room: {existingRoomId}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-3 mb-4" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                      <div className="fw-semibold text-success mb-1" style={{ fontSize: 12 }}>מה יקרה:</div>
                      <ol className="mb-0" style={{ fontSize: 12, paddingRight: '1.2rem', color: '#374151' }}>
                        {mode === 'import' ? (
                          <li>Beds24 יצור Property + Room חדשים מנכס ה-Airbnb</li>
                        ) : (
                          <li>החדר {existingRoomId} יחובר לנכס Airbnb {selectedListing?.listingId}</li>
                        )}
                        <li>שמירת Property ID ו-Room ID עבור המשתמש ב-Supabase</li>
                        <li>מילוי מטמון זמינות ל-3 חודשים</li>
                        <li>יצירת API Key ללוח השנה</li>
                      </ol>
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setStep('select-listing')}
                      >
                        ← חזרה
                      </button>
                      <button
                        type="button"
                        className="btn fw-bold flex-fill"
                        style={{ background: 'linear-gradient(135deg,#FF5A5F,#FF9A9E)', color: 'white', border: 'none' }}
                        onClick={handleRun}
                      >
                        🚀 הגדר והפעל לוח שנה
                      </button>
                    </div>
                  </div>
                )}

                {/* ── RUNNING ──────────────────────────────────────── */}
                {step === 'running' && (
                  <div className="text-center py-5">
                    <Loader2
                      size={48}
                      color="#667eea"
                      style={{ animation: 'spin .8s linear infinite', marginBottom: 16 }}
                    />
                    <h5 className="fw-bold">מגדיר לוח שנה...</h5>
                    <div className="text-muted small mt-2" style={{ lineHeight: 2 }}>
                      {mode === 'import'
                        ? <div>📥 מייבא נכס מ-Airbnb ל-Beds24</div>
                        : <div>🔗 מחבר נכס Airbnb לחדר קיים</div>
                      }
                      <div>💾 שומר ב-Supabase</div>
                      <div>📅 ממלא מטמון זמינות</div>
                      <div>🔑 יוצר API Key</div>
                    </div>
                  </div>
                )}

                {/* ── DONE ─────────────────────────────────────────── */}
                {step === 'done' && result && (
                  <div>
                    <div className="text-center mb-4">
                      <CheckCircle size={52} color="#10b981" />
                      <h4 className="fw-bold mt-2" style={{ color: '#059669' }}>לוח השנה חי!</h4>
                    </div>

                    <div className="d-flex flex-column gap-3">
                      <div className="p-3 rounded-3" style={{ background: '#f0f4ff', border: '1px solid #c7d2fe' }}>
                        <div className="row g-2 text-center">
                          <div className="col-6">
                            <div className="text-muted small">Property ID</div>
                            <code className="fw-bold" style={{ fontSize: 15, color: '#4338ca' }}>{result.propertyId}</code>
                          </div>
                          <div className="col-6">
                            <div className="text-muted small">Room ID</div>
                            <code className="fw-bold" style={{ fontSize: 15, color: '#4338ca' }}>{result.roomId}</code>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-3" style={{ background: '#ecfdf5', border: '1px solid #6ee7b7' }}>
                        <div className="d-flex align-items-center gap-2">
                          <Calendar size={16} color="#059669" />
                          <span className="fw-semibold" style={{ fontSize: 13, color: '#059669' }}>
                            מטמון: {result.cachedDays} ימים נכתבו
                          </span>
                        </div>
                        {result.cacheWarning && (
                          <div className="text-warning small mt-1">⚠️ {result.cacheWarning}</div>
                        )}
                      </div>

                      <div className="p-3 rounded-3" style={{ background: '#fffbeb', border: '1px solid #fcd34d' }}>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <Key size={16} color="#d97706" />
                          <span className="fw-semibold" style={{ fontSize: 13, color: '#d97706' }}>
                            API Key (שמור אותו — מוצג פעם אחת!)
                          </span>
                        </div>
                        <div className="input-group">
                          <input
                            readOnly
                            className="form-control form-control-sm"
                            value={result.apiKey}
                            style={{ fontSize: 11, fontFamily: 'monospace', direction: 'ltr' }}
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => navigator.clipboard.writeText(result.apiKey)}
                          >
                            העתק
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex gap-2 mt-4">
                      <Link href={`/admin/users/${userId}/edit`} className="flex-fill">
                        <button type="button" className="btn btn-outline-primary w-100 fw-bold">
                          ← עריכת משתמש
                        </button>
                      </Link>
                      <Link href="/admin/users" className="flex-fill">
                        <button
                          type="button"
                          className="btn fw-bold w-100"
                          style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', color: 'white', border: 'none' }}
                        >
                          רשימת משתמשים
                        </button>
                      </Link>
                    </div>
                  </div>
                )}

                {/* ── ERROR ────────────────────────────────────────── */}
                {step === 'error' && (
                  <div>
                    <div className="text-center mb-3">
                      <AlertCircle size={48} color="#dc2626" />
                      <h5 className="fw-bold mt-2 text-danger">אירעה שגיאה</h5>
                    </div>
                    <div className="alert alert-danger">
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12, direction: 'ltr' }}>
                        {errorMsg}
                      </pre>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline-secondary w-100"
                      onClick={reset}
                    >
                      ← נסה שוב
                    </button>
                  </div>
                )}

              </div>
            </div>

            <div className="text-center mt-3">
              <Link href="/admin/users" className="text-white opacity-75" style={{ textDecoration: 'none', fontSize: 13 }}>
                ← חזרה לניהול משתמשים
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
