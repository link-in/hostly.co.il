'use client'

import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Database, Eye, EyeOff, Home, KeyRound, Plus, RefreshCw, Save, Settings2, ShieldCheck, UserRound, X } from 'lucide-react'

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
      <div dir="rtl" className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', background: 'var(--hn-50)' }}>
        <div className="spinner-border text-primary" />
      </div>
    )
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: 'var(--hn-50)', color: 'var(--htxt-1)' }}>
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-xl-10">
            <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 align-items-lg-center mb-4">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: 'var(--hb-100)',
                    color: 'var(--hb)',
                    border: '1px solid var(--hb-200)',
                  }}
                >
                  <UserRound size={24} />
                </div>
                <div>
                  <p className="mb-1 fw-semibold" style={{ color: 'var(--hb)', fontSize: 13 }}>ניהול לקוחות</p>
                  <h1 className="h3 mb-1 fw-bold">עריכת משתמש</h1>
                  <p className="mb-0" style={{ color: 'var(--htxt-3)', fontSize: 14 }}>{formData.email}</p>
                </div>
              </div>
              <Link href="/admin/users" className="btn btn-outline-secondary d-inline-flex align-items-center gap-2 align-self-start align-self-lg-center">
                <ArrowLeft size={16} />
                לרשימת הלקוחות
              </Link>
            </div>

            <div className="row g-4 align-items-start">
              <div className="col-lg-8">
                <div
                  className="card shadow-sm"
                  style={{ borderRadius: 18, border: '1px solid var(--hborder)', background: 'var(--hsurf)', overflow: 'hidden' }}
                >
                  <div className="card-body p-4 p-md-5">
                    {error && <div className="alert alert-danger"><strong>שגיאה:</strong> {error}</div>}
                    {success && <div className="alert alert-success"><strong>עודכן בהצלחה!</strong> מעביר לרשימה...</div>}

                    <form onSubmit={handleSubmit}>
                      {/* ── פרטי חשבון ── */}
                      <section className="mb-5">
                        <div className="d-flex align-items-center gap-2 mb-3 pb-3" style={{ borderBottom: '1px solid var(--hborder-light)' }}>
                          <KeyRound size={18} style={{ color: 'var(--hb)' }} />
                          <div>
                            <h2 className="h5 fw-bold mb-0">פרטי חשבון</h2>
                            <small style={{ color: 'var(--htxt-3)' }}>עדכון אימייל או החלפת סיסמה ללקוח.</small>
                          </div>
                        </div>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label fw-semibold">אימייל <span className="text-danger">*</span></label>
                            <input type="email" className="form-control form-control-lg" value={formData.email}
                              onChange={(e) => handleChange('email', e.target.value)} required />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-semibold">
                              סיסמה חדשה <span style={{ color: 'var(--htxt-3)', fontWeight: 400, fontSize: 12 }}>(ריק = לא משנה)</span>
                            </label>
                            <div className="position-relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-control form-control-lg"
                                style={{ paddingLeft: 96 }}
                                value={formData.password}
                                onChange={(e) => handleChange('password', e.target.value)}
                                placeholder="השאר ריק לשמירת הסיסמה הנוכחית"
                              />
                              <div className="position-absolute d-flex align-items-center gap-1" style={{ left: 8, top: '50%', transform: 'translateY(-50%)' }}>
                                <button
                                  type="button"
                                  className="btn d-inline-flex align-items-center justify-content-center"
                                  onClick={() => setShowPassword(v => !v)}
                                  aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                                  style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 10,
                                    color: 'var(--htxt-3)',
                                    background: 'var(--hn-50)',
                                    border: '1px solid var(--hborder-light)',
                                  }}
                                >
                                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                                <button
                                  type="button"
                                  className="btn d-inline-flex align-items-center justify-content-center"
                                  onClick={() => handleChange('password', generatePassword())}
                                  aria-label="צור סיסמה חדשה"
                                  title="צור סיסמה"
                                  style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 10,
                                    color: 'var(--hb)',
                                    background: 'var(--hb-50)',
                                    border: '1px solid var(--hb-200)',
                                  }}
                                >
                                  <RefreshCw size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* ── פרטים אישיים ── */}
                      <section className="mb-5">
                        <div className="d-flex align-items-center gap-2 mb-3 pb-3" style={{ borderBottom: '1px solid var(--hborder-light)' }}>
                          <UserRound size={18} style={{ color: 'var(--hb)' }} />
                          <div>
                            <h2 className="h5 fw-bold mb-0">פרטי הלקוח והיחידה</h2>
                            <small style={{ color: 'var(--htxt-3)' }}>שם תצוגה, פרטי קשר וכתובת אתר.</small>
                          </div>
                        </div>
                        <div className="row g-3">
                          <div className="col-12">
                            <label className="form-label fw-semibold">שם תצוגה (שם היחידה) <span className="text-danger">*</span></label>
                            <input type="text" className="form-control form-control-lg" value={formData.displayName}
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
                      </section>

                      {/* ── Beds24 ── */}
                      <section className="mb-5">
                        <div className="d-flex align-items-center gap-2 mb-3 pb-3" style={{ borderBottom: '1px solid var(--hborder-light)' }}>
                          <Database size={18} style={{ color: 'var(--hb)' }} />
                          <div>
                            <h2 className="h5 fw-bold mb-0">חיבור ל-Beds24</h2>
                            <small style={{ color: 'var(--htxt-3)' }}>מזהה נכס וחדרים שמופיעים בדשבורד הלקוח.</small>
                          </div>
                        </div>

                        <div className="alert small mb-3" style={{ background: 'var(--hb-50)', border: '1px solid var(--hb-200)', color: 'var(--htxt-2)' }}>
                          <strong>איך למצוא:</strong>
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

                        <div className="mb-4">
                          <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
                            <label className="form-label fw-semibold mb-0">חדרים (Room IDs)</label>
                            <button type="button" className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1" onClick={addRoom}>
                              <Plus size={14} />
                              הוסף חדר
                            </button>
                          </div>
                          <div className="d-flex flex-column gap-2">
                            {rooms.map((room, index) => (
                              <div
                                key={index}
                                className="row g-2 align-items-start rounded-4 p-2"
                                style={{ background: 'var(--hn-50)', border: '1px solid var(--hborder-light)' }}
                              >
                                <div className="col-md-4">
                                  <input type="text" className="form-control" value={room.id}
                                    onChange={(e) => handleRoomChange(index, 'id', e.target.value)} placeholder="638851" />
                                  <small className="text-muted">Room ID</small>
                                </div>
                                <div className="col-md">
                                  <input type="text" className="form-control" value={room.name}
                                    onChange={(e) => handleRoomChange(index, 'name', e.target.value)} placeholder={`חדר ${index + 1}`} />
                                  <small className="text-muted">שם בדשבורד</small>
                                </div>
                                {rooms.length > 1 && (
                                  <div className="col-md-auto">
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger d-inline-flex align-items-center justify-content-center"
                                      onClick={() => removeRoom(index)}
                                      aria-label="הסר חדר"
                                      style={{ width: 38, height: 38 }}
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {rooms.filter(r => r.id.trim()).length > 1 && (
                            <small className="text-success fw-semibold d-block mt-2">
                              {rooms.filter(r => r.id.trim()).length} חדרים — יוצגו כטאבים בדשבורד
                            </small>
                          )}
                        </div>
                      </section>

                      {/* Submit */}
                      <div className="d-flex flex-column flex-sm-row gap-2 justify-content-end pt-3" style={{ borderTop: '1px solid var(--hborder-light)' }}>
                        <Link href="/admin/users" className="btn btn-outline-secondary px-4">ביטול</Link>
                        <button type="submit" className="btn btn-primary fw-bold px-4 d-inline-flex align-items-center justify-content-center gap-2" disabled={saving}>
                          {saving
                            ? <><span className="spinner-border spinner-border-sm" />שומר...</>
                            : <><Save size={16} />שמור שינויים</>}
                        </button>
                      </div>

                    </form>
                  </div>
                </div>
              </div>

              <div className="col-lg-4">
                <div className="d-flex flex-column gap-3">
                  <div
                    className="card shadow-sm"
                    style={{ borderRadius: 18, border: '1px solid var(--hborder)', background: 'linear-gradient(180deg, var(--hsurf), var(--hb-50))' }}
                  >
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center gap-3 mb-3">
                        <div
                          className="d-flex align-items-center justify-content-center"
                          style={{ width: 42, height: 42, borderRadius: 14, background: 'var(--hb-100)', color: 'var(--hb)' }}
                        >
                          <ShieldCheck size={21} />
                        </div>
                        <div>
                          <h2 className="h5 fw-bold mb-0">אשף קליטת לקוח</h2>
                          <small style={{ color: 'var(--htxt-3)' }}>נכס וחדר, מחיר, Airbnb, Booking.com והפעלה.</small>
                        </div>
                      </div>
                      <Link href={`/admin/onboarding/${userId}`} className="btn btn-primary w-100 d-inline-flex align-items-center justify-content-center gap-2">
                        <Settings2 size={16} />
                        לאשף הקליטה
                      </Link>
                    </div>
                  </div>

                  <div
                    className="card shadow-sm"
                    style={{ borderRadius: 18, border: '1px solid var(--hborder)', background: 'var(--hsurf)' }}
                  >
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center gap-3 mb-3">
                        <div
                          className="d-flex align-items-center justify-content-center"
                          style={{ width: 42, height: 42, borderRadius: 14, background: '#DBEAFE', color: '#1d4ed8' }}
                        >
                          <Home size={21} />
                        </div>
                        <div>
                          <h2 className="h5 fw-bold mb-0">תת-חשבון Beds24</h2>
                          <small style={{ color: 'var(--htxt-3)' }}>אופציונלי: שמירת טוקנים של תת-חשבון ייעודי.</small>
                        </div>
                      </div>
                      <Link href={`/admin/users/${userId}/beds24-setup`} className="btn btn-outline-primary w-100 d-inline-flex align-items-center justify-content-center gap-2">
                        <Database size={16} />
                        טוקנים לתת-חשבון
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
