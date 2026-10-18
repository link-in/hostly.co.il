'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, Eye, EyeOff, Mail, RefreshCw, ShieldCheck, Sparkles, UserPlus } from 'lucide-react'

type WizardStep = 1 | 2

const WIZARD_STEPS = [
  { id: 1 as WizardStep, label: 'חשבון' },
  { id: 2 as WizardStep, label: 'פרטים' },
]

function generatePassword(length = 12): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function CreateUserPage() {
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set())

  const [formData, setFormData] = useState({
    email: '',
    password: generatePassword(),
    displayName: '',
    firstName: '',
    lastName: '',
    landingPageUrl: '',
    phoneNumber: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleChange = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }))

  const goToStep = (step: WizardStep) => {
    if (completedSteps.has(step) || step < currentStep) setCurrentStep(step)
  }

  const markCompleteAndNext = () => {
    setCompletedSteps((prev) => new Set([...prev, currentStep]))
    if (currentStep < 2) setCurrentStep((prev) => (prev + 1) as WizardStep)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, propertyId: '', roomId: '' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'שגיאה ביצירת משתמש')
      setSuccess(true)
      router.push(`/admin/onboarding/${data.user.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה')
    } finally {
      setLoading(false)
    }
  }

  // ── Step validation ────────────────────────────────────────────────────────
  const canStep1 = formData.email.length > 3 && formData.password.length >= 6
  const canStep2 = formData.displayName.trim().length > 0

  // ── Render ────────────────────────────────────────────────────────────────
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
                  <UserPlus size={24} />
                </div>
                <div>
                  <p className="mb-1 fw-semibold" style={{ color: 'var(--hb)', fontSize: 13 }}>ניהול לקוחות</p>
                  <h1 className="h3 mb-1 fw-bold">הוספת לקוח חדש</h1>
                  <p className="mb-0" style={{ color: 'var(--htxt-3)', fontSize: 14 }}>
                    יצירת משתמש והעברה מיידית לאשף קליטה מסודר.
                  </p>
                </div>
              </div>
              <Link href="/admin/users" className="btn btn-outline-secondary d-inline-flex align-items-center gap-2 align-self-start align-self-lg-center">
                <ArrowLeft size={16} />
                לרשימת הלקוחות
              </Link>
            </div>

            <div className="row g-4 align-items-start">
              <div className="col-lg-7">
                <div
                  className="card shadow-sm"
                  style={{
                    borderRadius: 18,
                    border: '1px solid var(--hborder)',
                    overflow: 'hidden',
                    background: 'var(--hsurf)',
                  }}
                >

                  {/* Wizard Tabs */}
                  <div className="p-3 p-md-4 pb-0">
                    <div className="d-flex gap-2 p-1 rounded-4" style={{ background: 'var(--hn-50)', border: '1px solid var(--hborder-light)' }}>
                      {WIZARD_STEPS.map((step) => {
                        const isDone = completedSteps.has(step.id)
                        const isCurrent = currentStep === step.id
                        const isAccessible = isDone || step.id <= currentStep
                        return (
                          <button
                            key={step.id}
                            type="button"
                            onClick={() => goToStep(step.id)}
                            disabled={!isAccessible}
                            className="btn d-flex align-items-center justify-content-center gap-2 border-0"
                            style={{
                              flex: 1,
                              minHeight: 44,
                              borderRadius: 12,
                              cursor: isAccessible ? 'pointer' : 'default',
                              background: isCurrent ? 'var(--hsurf)' : 'transparent',
                              color: isCurrent ? 'var(--hb)' : isDone ? '#15803d' : 'var(--htxt-3)',
                              boxShadow: isCurrent ? '0 8px 22px rgba(47,49,51,0.08)' : 'none',
                              fontWeight: isCurrent ? 700 : 600,
                              fontSize: 14,
                            }}
                          >
                            <span
                              className="d-inline-flex align-items-center justify-content-center"
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 999,
                                background: isDone ? '#DCFCE7' : isCurrent ? 'var(--hb-100)' : 'var(--hn-100)',
                                color: isDone ? '#15803d' : isCurrent ? 'var(--hb)' : 'var(--htxt-3)',
                              }}
                            >
                              {isDone ? <Check size={14} /> : step.id}
                            </span>
                            {step.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className="card-body p-4 p-md-5">
                    {error && <div className="alert alert-danger mb-3"><strong>שגיאה:</strong> {error}</div>}
                    {success && <div className="alert alert-success mb-3"><strong>הצלחה!</strong> המשתמש נוצר. מעביר לאשף הקליטה...</div>}

                    {/* ─ Step 1: חשבון ─ */}
                    {currentStep === 1 && (
                      <div>
                        <div className="mb-4">
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <Mail size={18} style={{ color: 'var(--hb)' }} />
                            <h2 className="h5 fw-bold mb-0">פרטי כניסה</h2>
                          </div>
                          <p className="mb-0" style={{ color: 'var(--htxt-3)', fontSize: 14 }}>
                            נגדיר ללקוח חשבון Hostly ונשמור את המשך הקליטה לאשף הבא.
                          </p>
                        </div>

                        <div className="mb-3">
                          <label className="form-label fw-semibold">אימייל <span className="text-danger">*</span></label>
                          <input type="email" className="form-control form-control-lg" value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)} placeholder="user@example.com" autoFocus />
                        </div>
                        <div className="mb-3">
                          <label className="form-label fw-semibold">סיסמה <span className="text-danger">*</span></label>
                          <div className="position-relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              className="form-control form-control-lg"
                              style={{ paddingLeft: 96 }}
                              value={formData.password} onChange={(e) => handleChange('password', e.target.value)}
                              minLength={6} placeholder="לפחות 6 תווים"
                            />
                            <div
                              className="position-absolute d-flex align-items-center gap-1"
                              style={{ left: 8, top: '50%', transform: 'translateY(-50%)' }}
                            >
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
                                title="צור סיסמה"
                                aria-label="צור סיסמה חדשה"
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
                          <small style={{ color: 'var(--htxt-3)' }}>סיסמה נוצרת אוטומטית, אפשר לשנות לפני שליחה.</small>
                        </div>
                        <div className="d-flex justify-content-end mt-4">
                          <button
                            type="button"
                            className="btn btn-lg text-white px-4"
                            onClick={markCompleteAndNext}
                            disabled={!canStep1}
                            style={{ background: 'var(--hb)', borderColor: 'var(--hb)', borderRadius: 12 }}
                          >
                            הבא
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ─ Step 2: פרטים ─ */}
                    {currentStep === 2 && (
                      <div>
                        <div className="mb-4">
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <Sparkles size={18} style={{ color: 'var(--hb)' }} />
                            <h2 className="h5 fw-bold mb-0">פרטי הלקוח והיחידה</h2>
                          </div>
                          <p className="mb-0" style={{ color: 'var(--htxt-3)', fontSize: 14 }}>
                            שם התצוגה ישמש כברירת מחדל לשם הנכס באשף Beds24.
                          </p>
                        </div>

                        <div className="mb-3">
                          <label className="form-label fw-semibold">שם תצוגה (שם היחידה) <span className="text-danger">*</span></label>
                          <input type="text" className="form-control form-control-lg" value={formData.displayName}
                            onChange={(e) => handleChange('displayName', e.target.value)}
                            placeholder="למשל: דירת נופש תל אביב" autoFocus />
                        </div>
                        <div className="row g-3 mb-3">
                          <div className="col-md-6">
                            <label className="form-label fw-semibold">שם פרטי</label>
                            <input type="text" className="form-control" value={formData.firstName}
                              onChange={(e) => handleChange('firstName', e.target.value)} placeholder="ישראל" />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-semibold">שם משפחה</label>
                            <input type="text" className="form-control" value={formData.lastName}
                              onChange={(e) => handleChange('lastName', e.target.value)} placeholder="ישראלי" />
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
                        <div className="d-flex justify-content-between mt-4">
                          <button type="button" className="btn btn-outline-secondary px-4" onClick={() => setCurrentStep(1)}>חזור</button>
                          <button
                            type="button"
                            className="btn btn-lg text-white fw-semibold px-4"
                            onClick={handleSubmit}
                            disabled={loading || !canStep2}
                            style={{ background: '#15803d', borderColor: '#15803d', borderRadius: 12 }}
                          >
                            {loading
                              ? <><span className="spinner-border spinner-border-sm me-2" />יוצר...</>
                              : 'צור משתמש והמשך לקליטה'}
                          </button>
                        </div>
                        <p className="mt-3 mb-0" style={{ color: 'var(--htxt-3)', fontSize: 13 }}>
                          אחרי היצירה תועבר לאשף הקליטה: נכס וחדר ב-Beds24, מחיר, חיבור ערוצים והפעלה.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-lg-5">
                <div
                  className="card shadow-sm"
                  style={{
                    borderRadius: 18,
                    border: '1px solid var(--hborder)',
                    background: 'linear-gradient(180deg, var(--hsurf), var(--hb-50))',
                  }}
                >
                  <div className="card-body p-4">
                    <div
                      className="d-flex align-items-center justify-content-center mb-3"
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        background: 'var(--hb-100)',
                        color: 'var(--hb)',
                      }}
                    >
                      <ShieldCheck size={22} />
                    </div>
                    <h2 className="h5 fw-bold mb-2">מה קורה אחרי היצירה?</h2>
                    <p className="mb-4" style={{ color: 'var(--htxt-3)', fontSize: 14 }}>
                      הלקוח נוצר כ־Owner ומועבר למסלול קליטה מובנה, כדי לא לערבב בין פרטי משתמש לבין פעולות Beds24.
                    </p>
                    <div className="d-flex flex-column gap-3">
                      {[
                        'יצירת נכס וחדר בחשבון המאסטר',
                        'קביעת מחיר בסיס וזמינות',
                        'חיבור Airbnb עם מכפיל 1.21',
                        'צ׳קליסט Booking.com והפעלה',
                      ].map((item, index) => (
                        <div key={item} className="d-flex align-items-start gap-3">
                          <span
                            className="d-inline-flex align-items-center justify-content-center fw-bold"
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 999,
                              background: 'var(--hsurf)',
                              color: 'var(--hb)',
                              border: '1px solid var(--hb-200)',
                              fontSize: 12,
                              flexShrink: 0,
                            }}
                          >
                            {index + 1}
                          </span>
                          <span style={{ fontSize: 14, color: 'var(--htxt-2)' }}>{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="alert mt-4 mb-0" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', fontSize: 13 }}>
                      לאחר יצירה, שלח ללקוח את כתובת הכניסה ואת פרטי ההתחברות.
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
