'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardHeader from '@/components/DashboardHeader'
import DashboardLoader from '@/components/DashboardLoader'
import { Loader2 } from 'lucide-react'

interface Settings {
  enabled: boolean
  photoUrl: string | null
  photoStoragePath: string | null
  introText: string | null
  wazeLink: string | null
  houseRules: string | null
}

const DEFAULT_SETTINGS: Settings = {
  enabled: false,
  photoUrl: null,
  photoStoragePath: null,
  introText: '',
  wazeLink: '',
  houseRules: '',
}

const inputStyle: React.CSSProperties = {
  borderRadius: '8px',
  border: '1px solid #e0e0e0',
  padding: '0.6rem',
  width: '100%',
  fontSize: '14px',
}

export default function ArrivalMessageClient() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [testSending, setTestSending] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (!session?.user) return
    fetch('/api/dashboard/arrival-message-settings')
      .then((r) => r.json())
      .then((data) => {
        setSettings({
          enabled: data.enabled ?? false,
          photoUrl: data.photoUrl ?? null,
          photoStoragePath: data.photoStoragePath ?? null,
          introText: data.introText ?? '',
          wazeLink: data.wazeLink ?? '',
          houseRules: data.houseRules ?? '',
        })
      })
      .catch(() => setErr('שגיאה בטעינת הגדרות'))
      .finally(() => setLoading(false))
  }, [session?.user])

  const handleSave = async () => {
    setMsg(null)
    setErr(null)
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/arrival-message-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: settings.enabled,
          introText: settings.introText || null,
          wazeLink: settings.wazeLink || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'שגיאה בשמירה')
      setMsg('ההגדרות נשמרו בהצלחה ✅')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    setMsg(null)
    setErr(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/dashboard/arrival-message-photo', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'העלאה נכשלה')
      setSettings((s) => ({ ...s, photoUrl: data.url, photoStoragePath: data.storagePath }))
      setMsg('התמונה הועלתה בהצלחה ✅')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'העלאה נכשלה')
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handlePhotoDelete = async () => {
    if (!confirm('למחוק את תמונת הבית?')) return
    setErr(null)
    try {
      const params = settings.photoStoragePath
        ? `?path=${encodeURIComponent(settings.photoStoragePath)}`
        : ''
      const res = await fetch(`/api/dashboard/arrival-message-photo${params}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'מחיקה נכשלה')
      setSettings((s) => ({ ...s, photoUrl: null, photoStoragePath: null }))
      setMsg('התמונה נמחקה')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'מחיקה נכשלה')
    }
  }

  const handleTestSend = async () => {
    setMsg(null)
    setErr(null)
    setTestSending(true)
    try {
      const res = await fetch('/api/dashboard/arrival-messages/test-send', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'שליחה נכשלה')
      setMsg(`הודעת בדיקה נשלחה לטלפון שלך (${data.sentTo ?? ''}) ✅`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'שליחה נכשלה')
    } finally {
      setTestSending(false)
    }
  }

  if (status === 'loading' || loading) return <DashboardLoader />
  if (!session?.user) return null

  return (
    <main dir="rtl" style={{ minHeight: '100vh' }}>
      <div className="container py-3 py-md-4">
        <div className="mb-3 mb-md-4">
          <DashboardHeader session={session} currentPage="arrival-message" />
        </div>

        <div className="row justify-content-center">
          <div className="col-12 col-lg-8">

            {/* Page header */}
            <div className="mb-4">
              <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>הודעת בוקר ליום צ'ק-אין</h1>
              <p style={{ color: '#666', fontSize: '14px', marginTop: 6 }}>
                הודעה אוטומטית שתישלח ב-09:00 לאורחים שמגיעים היום — כולל תמונת הבית, הסבר, קישור Waze וכללי הבית.
              </p>
            </div>

            {msg && (
              <div className="alert alert-success py-2 px-3" style={{ fontSize: '14px' }}>
                {msg}
              </div>
            )}
            {err && (
              <div className="alert alert-danger py-2 px-3" style={{ fontSize: '14px' }}>
                {err}
              </div>
            )}

            {/* Enable toggle */}
            <div className="hostly-card mb-3">
              <div className="card-body d-flex align-items-center justify-content-between gap-3" style={{ padding: '16px 20px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>הפעל אוטומציה</div>
                  <div style={{ color: '#888', fontSize: '13px', marginTop: 2 }}>
                    כאשר מופעל, הודעות יישלחו אוטומטית בכל בוקר שיש אורחים מגיעים
                  </div>
                </div>
                <div className="form-check form-switch mb-0">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    role="switch"
                    id="enabled-toggle"
                    style={{ width: '2.5rem', height: '1.4rem', cursor: 'pointer' }}
                    checked={settings.enabled}
                    onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
                  />
                </div>
              </div>
            </div>

            {/* Photo */}
            <div className="hostly-card mb-3">
              <div className="card-header">תמונת הבית</div>
              <div className="card-body">
                {settings.photoUrl ? (
                  <div className="mb-3">
                    <img
                      src={settings.photoUrl}
                      alt="תמונת הבית"
                      style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8 }}
                    />
                    <div className="d-flex gap-2 mt-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                      >
                        {uploadingPhoto ? (
                          <><Loader2 size={14} className="me-1" style={{ animation: 'spin 1s linear infinite' }} /> מעלה...</>
                        ) : 'החלף תמונה'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={handlePhotoDelete}
                      >
                        הסר תמונה
                      </button>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#888', fontSize: '13px', marginBottom: 12 }}>
                    לא הועלתה תמונה עדיין. התמונה תישלח כהודעת מדיה ב-WhatsApp.
                  </p>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="d-none"
                  onChange={handlePhotoUpload}
                />
                {!settings.photoUrl && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? (
                      <><Loader2 size={14} className="me-1" style={{ animation: 'spin 1s linear infinite' }} /> מעלה...</>
                    ) : 'העלה תמונה'}
                  </button>
                )}
              </div>
            </div>

            {/* Text fields */}
            <div className="hostly-card mb-3">
              <div className="card-header">תוכן ההודעה</div>
              <div className="card-body d-flex flex-column gap-3">
                <div>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                    הודעה
                    <span style={{ color: '#888', fontWeight: 400, marginRight: 6 }}>(תופיע מתחת לתמונה)</span>
                  </label>
                  <textarea
                    className="form-control"
                    style={{ ...inputStyle, minHeight: 150 }}
                    placeholder={`לדוגמה:\nכניסה עם קוד 1234, חניה חופשית לפני הבית\n\nכללי הבית:\nאין עישון, שקט אחרי 23:00`}
                    value={settings.introText ?? ''}
                    onChange={(e) => setSettings((s) => ({ ...s, introText: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                    קישור Waze
                  </label>
                  <input
                    type="url"
                    className="form-control"
                    style={inputStyle}
                    placeholder="https://waze.com/ul?..."
                    value={settings.wazeLink ?? ''}
                    onChange={(e) => setSettings((s) => ({ ...s, wazeLink: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="d-flex gap-2 flex-wrap mb-5">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
                style={{ minWidth: 130, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                {saving ? 'שומר...' : 'שמור הגדרות'}
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleTestSend}
                disabled={testSending || !settings.photoUrl}
                title={!settings.photoUrl ? 'יש להעלות תמונה לפני שליחת בדיקה' : ''}
                style={{ minWidth: 160, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {testSending && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                {testSending ? 'שולח...' : 'שלח לי הודעת בדיקה'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </main>
  )
}
