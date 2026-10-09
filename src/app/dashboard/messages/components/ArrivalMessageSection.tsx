'use client'

import React, { useState, useEffect, useRef } from 'react'
import { BellRing, Check, Image as ImageIcon, Send, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui'

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
  border: '1px solid var(--hborder)',
  padding: '0.6rem',
  width: '100%',
  fontSize: '14px',
  background: '#fff',
  color: 'var(--htxt-1)',
}

export default function ArrivalMessageSection() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [testSending, setTestSending] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    fetch('/api/dashboard/arrival-message-settings')
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        setSettings({
          enabled: data.enabled ?? false,
          photoUrl: data.photoUrl ?? null,
          photoStoragePath: data.photoStoragePath ?? null,
          introText: data.introText ?? '',
          wazeLink: data.wazeLink ?? '',
          houseRules: data.houseRules ?? '',
        })
      })
      .catch(() => {
        if (active) setErr('שגיאה בטעינת הגדרות')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

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
      setMsg('ההגדרות נשמרו בהצלחה')
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
      setMsg('התמונה הועלתה בהצלחה')
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
      setMsg(`הודעת בדיקה נשלחה לטלפון שלך (${data.sentTo ?? ''})`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'שליחה נכשלה')
    } finally {
      setTestSending(false)
    }
  }

  return (
    <section aria-labelledby="arrival-message-title" className="mb-5">
      {/* כותרת מקטע */}
      <div className="d-flex align-items-center gap-3 mb-3">
        <div
          className="d-flex align-items-center justify-content-center flex-shrink-0"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'var(--hb-100)',
            color: 'var(--hb)',
          }}
        >
          <BellRing size={20} />
        </div>
        <div>
          <h2
            id="arrival-message-title"
            style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--htxt-1)' }}
          >
            הודעת יום הגעה
          </h2>
          <p style={{ color: 'var(--htxt-3)', fontSize: '13px', margin: 0 }}>
            הודעה אוטומטית שתישלח ב-09:00 לאורחים שמגיעים היום — כולל תמונת הבית, הסבר, קישור Waze וכללי הבית.
          </p>
        </div>
      </div>

      {msg && (
        <div className="alert alert-success py-2 px-3 mb-3" style={{ fontSize: '14px' }}>
          {msg}
        </div>
      )}
      {err && (
        <div className="alert alert-danger py-2 px-3 mb-3" style={{ fontSize: '14px' }}>
          {err}
        </div>
      )}

      {/* Enable toggle */}
      <div className="hostly-card mb-3">
        <div className="card-body d-flex align-items-center justify-content-between gap-3" style={{ padding: '16px 20px' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>הפעל אוטומציה</div>
            <div style={{ color: 'var(--htxt-3)', fontSize: '13px', marginTop: 2 }}>
              כאשר מופעל, הודעות יישלחו אוטומטית בכל בוקר שיש אורחים מגיעים
            </div>
          </div>
          <div className="form-check form-switch mb-0">
            <input
              type="checkbox"
              className="form-check-input"
              role="switch"
              id="arrival-enabled-toggle"
              style={{ width: '2.5rem', height: '1.4rem', cursor: 'pointer' }}
              checked={settings.enabled}
              onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
            />
          </div>
        </div>
      </div>

      {/* House photo */}
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
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  loading={uploadingPhoto}
                >
                  {uploadingPhoto ? 'מעלה...' : 'החלף תמונה'}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handlePhotoDelete}
                >
                  הסר תמונה
                </Button>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--htxt-3)', fontSize: '13px', marginBottom: 12 }}>
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
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              loading={uploadingPhoto}
            >
              {uploadingPhoto ? 'מעלה...' : 'העלה תמונה'}
            </Button>
          )}
        </div>
      </div>

      {/* Message content */}
      <div className="hostly-card mb-3">
        <div className="card-header">תוכן ההודעה</div>
        <div className="card-body d-flex flex-column gap-3">
          <div>
            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
              הודעה
              <span style={{ color: 'var(--htxt-3)', fontWeight: 400, marginRight: 6 }}>
                (תופיע מתחת לתמונה)
              </span>
            </label>
            <textarea
              className="form-control"
              style={{ ...inputStyle, minHeight: 140 }}
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
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="d-flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="primary"
          onClick={handleSave}
          disabled={saving}
          loading={saving}
          style={{ minWidth: 130 }}
        >
          {saving ? 'שומר...' : 'שמור הגדרות'}
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={handleTestSend}
          disabled={testSending || !settings.photoUrl}
          loading={testSending}
          title={!settings.photoUrl ? 'יש להעלות תמונה לפני שליחת בדיקה' : ''}
          style={{ minWidth: 160 }}
        >
          {testSending ? 'שולח...' : 'שלח לי הודעת בדיקה'}
        </Button>
      </div>
    </section>
  )
}
