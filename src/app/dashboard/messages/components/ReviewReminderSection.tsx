'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { CheckCircle2, MessageSquare, RefreshCw, Star } from 'lucide-react'
import { Button } from '@/components/ui'

const inputStyle: React.CSSProperties = {
  borderRadius: '8px',
  border: '1px solid var(--hborder)',
  padding: '0.6rem',
  width: '100%',
  fontSize: '14px',
  background: '#fff',
  color: 'var(--htxt-1)',
}

export default function ReviewReminderSection() {
  const { data: session, update } = useSession()

  const [googleReviewUrl, setGoogleReviewUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [testSending, setTestSending] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testError, setTestError] = useState<string | null>(null)

  const [liveSending, setLiveSending] = useState(false)
  const [liveResult, setLiveResult] = useState<string | null>(null)
  const [liveError, setLiveError] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user?.googleReviewUrl !== undefined) {
      setGoogleReviewUrl(session.user.googleReviewUrl ?? '')
    }
  }, [session?.user?.googleReviewUrl])

  const handleSaveUrl = async () => {
    setSaveError(null)
    setSaveSuccess(null)

    const trimmed = googleReviewUrl.trim()
    if (trimmed && !trimmed.match(/^https?:\/\/.+/)) {
      setSaveError('קישור לביקורת בגוגל חייב להיות כתובת URL תקינה (מתחילה ב-http:// או https://)')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ googleReviewUrl: trimmed }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'שגיאה בשמירת הקישור')

      await update({ googleReviewUrl: trimmed })
      setSaveSuccess('קישור הביקורת נשמר בהצלחה')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'שגיאה בשמירת הקישור')
    } finally {
      setSaving(false)
    }
  }

  const handleTestSend = async () => {
    setTestError(null)
    setTestResult(null)
    setTestSending(true)
    try {
      const res = await fetch('/api/dashboard/review-reminders/test-send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ channel: 'direct' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'שליחת הודעת הבדיקה נכשלה')
      setTestResult(
        `הודעת בדיקה נשלחה למספר שלך (${session?.user?.phoneNumber || 'המספר בפרופיל'})`
      )
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'שגיאה לא ידועה')
    } finally {
      setTestSending(false)
    }
  }

  const handleSendNow = async () => {
    setLiveError(null)
    setLiveResult(null)
    setLiveSending(true)
    try {
      const res = await fetch('/api/dashboard/review-reminders/send-now', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'השליחה נכשלה')
      setLiveResult(
        `נבדקו ${data.bookingsFound} הזמנות ל-${data.date}: ${data.sent} נשלחו, ${data.skipped} דולגו (כבר נשלחו/אין טלפון), ${data.failed} נכשלו`
      )
    } catch (err) {
      setLiveError(err instanceof Error ? err.message : 'שגיאה לא ידועה')
    } finally {
      setLiveSending(false)
    }
  }

  return (
    <section aria-labelledby="review-reminder-title" className="mb-5">
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
          <Star size={20} />
        </div>
        <div>
          <h2
            id="review-reminder-title"
            style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--htxt-1)' }}
          >
            הודעת ביקורת אחרי צ'ק-אאוט
          </h2>
          <p style={{ color: 'var(--htxt-3)', fontSize: '13px', margin: 0 }}>
            בבוקר שאחרי הצ'ק-אאוט תישלח לאורח הודעת WhatsApp אוטומטית עם תודה ובקשה לכתוב ביקורת.
          </p>
        </div>
      </div>

      {/* הגדרות קישור ביקורת */}
      <div className="hostly-card mb-3">
        <div className="card-header">הגדרות ביקורת</div>
        <div className="card-body d-flex flex-column gap-3">
          <p style={{ color: 'var(--htxt-3)', fontSize: '13.5px', margin: 0, lineHeight: 1.6 }}>
            בבוקר שאחרי הצ'ק-אאוט תישלח לאורח הודעת WhatsApp אוטומטית עם תודה ובקשה לכתוב ביקורת.
            בהזמנה ישירה תישלח ההודעה עם הקישור שתגדירו כאן; בהזמנה מ-Airbnb או Booking.com תישלח תזכורת לכתוב ביקורת באפליקציה עצמה.
          </p>

          <div>
            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
              קישור לביקורת בגוגל (Google Review)
            </label>
            <input
              type="url"
              className="form-control"
              style={inputStyle}
              value={googleReviewUrl}
              onChange={(e) => setGoogleReviewUrl(e.target.value)}
              placeholder="https://g.page/r/..."
              dir="ltr"
            />
            <small style={{ color: 'var(--htxt-3)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              יישלח לאורחים שהזמינו ישירות (לא דרך Airbnb/Booking.com). אם נשאר ריק, ההודעה תבקש משוב בלבד ללא קישור.
            </small>
          </div>

          {saveSuccess && (
            <div className="alert alert-success py-2 px-3 mb-0" style={{ fontSize: '14px' }}>
              {saveSuccess}
            </div>
          )}
          {saveError && (
            <div className="alert alert-danger py-2 px-3 mb-0" style={{ fontSize: '14px' }}>
              {saveError}
            </div>
          )}

          <div>
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveUrl}
              disabled={saving}
              loading={saving}
              style={{ minWidth: 140 }}
            >
              {saving ? 'שומר...' : 'שמור קישור ביקורת'}
            </Button>
          </div>
        </div>
      </div>

      {/* שליחה ובדיקה */}
      <div className="hostly-card mb-3">
        <div className="card-header">שליחה ובדיקה</div>
        <div className="card-body d-flex flex-column gap-3">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <Button
              type="button"
              variant="secondary"
              onClick={handleTestSend}
              disabled={testSending}
              loading={testSending}
              iconStart={<MessageSquare size={14} />}
              style={{ minWidth: 180 }}
            >
              {testSending ? 'שולח...' : 'שלח הודעת בדיקה למספר שלי'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={handleSendNow}
              disabled={liveSending}
              loading={liveSending}
              iconStart={<RefreshCw size={14} />}
              title="מריץ עכשיו את הבדיקה האמיתית מול Beds24 לאורחים שיצאו אתמול — בטוח ללחוץ כמה פעמים, הזמנות שכבר נשלחו לא יישלחו שוב"
              style={{ minWidth: 240 }}
            >
              {liveSending ? 'מריץ...' : 'הפעל שליחה עבור אתמול (מול הזמנות אמיתיות)'}
            </Button>
          </div>

          {testError && <div className="alert alert-danger py-2 px-3 mb-0 small">{testError}</div>}
          {testResult && <div className="alert alert-success py-2 px-3 mb-0 small">{testResult}</div>}
          {liveError && <div className="alert alert-danger py-2 px-3 mb-0 small">{liveError}</div>}
          {liveResult && <div className="alert alert-success py-2 px-3 mb-0 small">{liveResult}</div>}

          <div style={{ color: 'var(--htxt-3)', fontSize: '12px', lineHeight: 1.5 }}>
            • "שלח הודעת בדיקה" — הודעת תצוגה מקדימה למספר שלך בלבד, לא נוגעת בהזמנות אמיתיות.
            <br />
            • "הפעל שליחה עבור אתמול" — שולח בפועל לאורחים שיצאו אתמול (בדיוק כמו הריצה היומית האוטומטית), שימושי אם רוצים לבדוק או להריץ שוב בלי לחכות לקרון.
          </div>
        </div>
      </div>
    </section>
  )
}
