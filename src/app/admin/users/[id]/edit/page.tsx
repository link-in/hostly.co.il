'use client'

import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, RefreshCw, ExternalLink, Loader2, Copy, Check } from 'lucide-react'

interface RoomEntry { id: string; name: string }

function generatePassword(length = 12): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function parseRoomId(roomId: string): RoomEntry[] {
  if (!roomId?.trim()) return [{ id: '', name: '' }]
  return roomId.split(',').map((part) => {
    const [id, ...nameParts] = part.trim().split(':')
    return { id: id.trim(), name: nameParts.join(':').trim() }
  })
}

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = use(params)
  const router = useRouter()

  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    firstName: '',
    lastName: '',
    propertyId: '',
    landingPageUrl: '',
    phoneNumber: '',
  })
  const [rooms, setRooms] = useState<RoomEntry[]>([{ id: '', name: '' }])
  const [showPassword, setShowPassword] = useState(false)
  const [airbnbLinking, setAirbnbLinking] = useState(false)
  const [airbnbLinkError, setAirbnbLinkError] = useState<string | null>(null)
  const [airbnbUrl, setAirbnbUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // ── Load user ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((data) => {
        const user = (data.users ?? []).find((u: { id: string }) => u.id === userId)
        if (!user) { setError('משתמש לא נמצא'); setLoadingData(false); return }
        setFormData({
          email: user.email ?? '',
          password: '',
          displayName: user.displayName ?? '',
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
          propertyId: user.propertyId ?? '',
          landingPageUrl: user.landingPageUrl ?? '',
          phoneNumber: user.phoneNumber ?? '',
        })
        setRooms(parseRoomId(user.roomId ?? ''))
        setLoadingData(false)
      })
      .catch(() => { setError('שגיאה בטעינת נתוני משתמש'); setLoadingData(false) })
  }, [userId])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const handleChange = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }))

  const handleRoomChange = (index: number, field: keyof RoomEntry, value: string) =>
    setRooms((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))

  const addRoom = () => setRooms((prev) => [...prev, { id: '', name: '' }])
  const removeRoom = (index: number) =>
    setRooms((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))

  const handleConnectAirbnb = async () => {
    setAirbnbLinkError(null)
    setAirbnbUrl(null)
    if (!formData.propertyId.trim()) {
      setAirbnbLinkError('יש להזין Property ID לפני החיבור לAirbnb')
      return
    }
    setAirbnbLinking(true)
    try {
      const res = await fetch(`/api/admin/beds24/airbnb-auth-url?propertyId=${formData.propertyId.trim()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'שגיאה בקבלת קישור Airbnb')
      setAirbnbUrl(data.url)
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setAirbnbLinkError(err instanceof Error ? err.message : 'שגיאה לא ידועה')
    } finally {
      setAirbnbLinking(false)
    }
  }

  const handleCopyAirbnbUrl = async () => {
    if (!airbnbUrl) return
    await navigator.clipboard.writeText(airbnbUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const buildRoomId = () =>
    rooms
      .filter((r) => r.id.trim())
      .map((r) => (r.name.trim() ? `${r.id.trim()}:${r.name.trim()}` : r.id.trim()))
      .join(',')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, roomId: buildRoomId() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'שגיאה בעדכון')
      setSuccess(true)
      setTimeout(() => router.push('/admin/users'), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loadingData) {
    return (
      <div dir="rtl" className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" />
      </div>
    )
  }

  return (
    <>
    <style>{`.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <div dir="rtl" style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%)' }}>
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-6">
            <div className="card border-0 shadow-lg" style={{ borderRadius: 16 }}>

              {/* Header */}
              <div className="card-header border-0 text-white"
                style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: '16px 16px 0 0', padding: '1.5rem' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h1 className="h4 mb-0 fw-bold">עריכת משתמש</h1>
                    <small className="opacity-75">{formData.email}</small>
                  </div>
                  <Link href="/admin/users">
                    <button className="btn btn-light btn-sm">← חזרה לרשימה</button>
                  </Link>
                </div>
              </div>

              <div className="card-body p-4">
                {error && <div className="alert alert-danger"><strong>שגיאה:</strong> {error}</div>}
                {success && <div className="alert alert-success"><strong>עודכן בהצלחה!</strong> מעביר לרשימה...</div>}

                <form onSubmit={handleSubmit}>

                  {/* ── פרטי חשבון ── */}
                  <h6 className="text-muted fw-semibold mb-3 border-bottom pb-2">פרטי חשבון</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">אימייל <span className="text-danger">*</span></label>
                      <input type="email" className="form-control" value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        סיסמה חדשה <span className="text-muted fw-normal small">(ריק = לא משנה)</span>
                      </label>
                      <div className="input-group">
                        <input type={showPassword ? 'text' : 'password'} className="form-control"
                          value={formData.password} onChange={(e) => handleChange('password', e.target.value)}
                          placeholder="השאר ריק לשמירת הסיסמה הנוכחית" />
                        <button type="button" className="btn btn-link text-secondary px-2" onClick={() => setShowPassword(v => !v)}>
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button type="button" className="btn btn-link text-secondary px-2"
                          onClick={() => handleChange('password', generatePassword())}>
                          <RefreshCw size={15} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── פרטים אישיים ── */}
                  <h6 className="text-muted fw-semibold mb-3 border-bottom pb-2">פרטים אישיים</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-12">
                      <label className="form-label fw-semibold">שם תצוגה (שם היחידה) <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" value={formData.displayName}
                        onChange={(e) => handleChange('displayName', e.target.value)} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">שם פרטי</label>
                      <input type="text" className="form-control" value={formData.firstName}
                        onChange={(e) => handleChange('firstName', e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">שם משפחה</label>
                      <input type="text" className="form-control" value={formData.lastName}
                        onChange={(e) => handleChange('lastName', e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">טלפון</label>
                      <input type="tel" className="form-control" value={formData.phoneNumber}
                        onChange={(e) => handleChange('phoneNumber', e.target.value)} placeholder="+972501234567" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">כתובת אתר</label>
                      <input type="url" className="form-control" value={formData.landingPageUrl}
                        onChange={(e) => handleChange('landingPageUrl', e.target.value)} placeholder="https://..." />
                    </div>
                  </div>

                  {/* ── Beds24 ── */}
                  <h6 className="text-muted fw-semibold mb-3 border-bottom pb-2">חיבור ל-Beds24</h6>

                  <div className="alert alert-info small mb-3">
                    <strong>📋 איך למצוא:</strong>
                    <ul className="mb-0 mt-1">
                      <li><strong>Property ID</strong> — Beds24 → Settings → Property</li>
                      <li><strong>Room ID</strong> — Beds24 → Settings → Rooms</li>
                    </ul>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Property ID</label>
                    <input type="text" className="form-control" value={formData.propertyId}
                      onChange={(e) => handleChange('propertyId', e.target.value)} placeholder="306559" />
                  </div>

                  {/* ── Airbnb Connect ── */}
                  <div className="mb-4 p-3 rounded-3" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold" style={{ color: '#c2410c' }}>
                          <img src="https://upload.wikimedia.org/wikipedia/commons/6/69/Airbnb_Logo_Bélo.svg"
                            alt="Airbnb" width={18} style={{ verticalAlign: 'middle', marginLeft: 6 }} />
                          חיבור חשבון Airbnb
                        </div>
                        <small className="text-muted">
                          לאחר האישור תועבר לעמוד Beds24 — זה תקין, החיבור הצליח
                        </small>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm fw-bold d-flex align-items-center gap-2"
                        style={{ background: '#ff5a5f', color: '#fff', border: 'none', whiteSpace: 'nowrap', opacity: airbnbLinking ? 0.7 : 1 }}
                        disabled={airbnbLinking}
                        onClick={handleConnectAirbnb}
                      >
                        {airbnbLinking
                          ? <><Loader2 size={14} className="spin" /> מחפש קישור...</>
                          : <><ExternalLink size={14} /> חבר Airbnb</>}
                      </button>
                    </div>
                    {airbnbLinkError && (
                      <div className="alert alert-danger mb-0 mt-2 py-2 small">{airbnbLinkError}</div>
                    )}
                    {airbnbUrl && (
                      <div className="mt-2 p-2 rounded-2" style={{ background: '#ecfdf5', border: '1px solid #6ee7b7' }}>
                        <div className="small fw-semibold text-success mb-1">✓ קישור מוכן — שלח לבעל הנכס לאישור</div>
                        <div className="d-flex gap-2 align-items-center">
                          <input
                            readOnly
                            className="form-control form-control-sm"
                            value={airbnbUrl}
                            style={{ fontSize: 11, direction: 'ltr' }}
                          />
                          <button
                            type="button"
                            className="btn btn-sm fw-bold d-flex align-items-center gap-1"
                            style={{ background: copied ? '#059669' : '#374151', color: '#fff', border: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
                            onClick={handleCopyAirbnbUrl}
                          >
                            {copied ? <><Check size={13} /> הועתק!</> : <><Copy size={13} /> העתק</>}
                          </button>
                        </div>
                        <small className="text-muted">בעל הנכס פותח את הקישור, מתחבר עם Airbnb שלו ומאשר — לאחר האישור יועבר לעמוד Beds24, זה תקין והחיבור הצליח</small>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <label className="form-label fw-semibold mb-0">חדרים (Room IDs)</label>
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={addRoom}>+ הוסף חדר</button>
                    </div>
                    {rooms.map((room, index) => (
                      <div key={index} className="d-flex gap-2 mb-2 align-items-center">
                        <div style={{ flex: '0 0 150px' }}>
                          <input type="text" className="form-control" value={room.id}
                            onChange={(e) => handleRoomChange(index, 'id', e.target.value)} placeholder="638851" />
                          <small className="text-muted">Room ID</small>
                        </div>
                        <div style={{ flex: 1 }}>
                          <input type="text" className="form-control" value={room.name}
                            onChange={(e) => handleRoomChange(index, 'name', e.target.value)} placeholder={`חדר ${index + 1}`} />
                          <small className="text-muted">שם בדשבורד</small>
                        </div>
                        {rooms.length > 1 && (
                          <button type="button" className="btn btn-sm btn-outline-danger"
                            onClick={() => removeRoom(index)} style={{ flexShrink: 0 }}>✕</button>
                        )}
                      </div>
                    ))}
                    {rooms.filter(r => r.id.trim()).length > 1 && (
                      <small className="text-success fw-semibold">
                        ✓ {rooms.filter(r => r.id.trim()).length} חדרים — יוצגו כטאבים בדשבורד
                      </small>
                    )}
                  </div>

                  {/* Submit */}
                  <div className="d-flex gap-2 justify-content-end">
                    <Link href="/admin/users">
                      <button type="button" className="btn btn-outline-secondary">ביטול</button>
                    </Link>
                    <button type="submit" className="btn btn-primary fw-bold px-4" disabled={saving}
                      style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none' }}>
                      {saving
                        ? <><span className="spinner-border spinner-border-sm me-2" />שומר...</>
                        : '💾 שמור שינויים'}
                    </button>
                  </div>

                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
