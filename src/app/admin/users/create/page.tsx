'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, RefreshCw, Check } from 'lucide-react'

type WizardStep = 1 | 2

const WIZARD_STEPS = [
  { id: 1 as WizardStep, label: 'חשבון',  icon: '👤' },
  { id: 2 as WizardStep, label: 'פרטים',  icon: '📝' },
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
    <div dir="rtl" style={{ minHeight: '100vh', background: 'var(--hn-50)' }}>
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-6">
            <div className="card hostly-dark-card shadow-sm">

              {/* Header */}
              <div className="card-header border-0"
                style={{ background: 'var(--hsurf)', borderBottom: '1px solid var(--hborder-light)', borderRadius: '8px 8px 0 0', padding: '1.25rem 1.5rem' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <h1 className="h4 mb-0 fw-bold">הוספת לקוח חדש</h1>
                  <Link href="/admin/users">
                    <button className="btn btn-outline-secondary btn-sm">← חזרה</button>
                  </Link>
                </div>
              </div>

              {/* Wizard Tabs */}
              <div className="px-4 pt-4 pb-0">
                <div className="d-flex gap-2">
                  {WIZARD_STEPS.map((step, i) => {
                    const isDone = completedSteps.has(step.id)
                    const isCurrent = currentStep === step.id
                    const isAccessible = isDone || step.id <= currentStep
                    return (
                      <React.Fragment key={step.id}>
                        <button type="button" onClick={() => goToStep(step.id)} disabled={!isAccessible}
                          style={{
                            flex: 1, border: 'none', borderRadius: '10px 10px 0 0',
                            padding: '10px 8px 12px', cursor: isAccessible ? 'pointer' : 'default',
                            background: isCurrent ? 'var(--hb)' : isDone ? '#e8f5e9' : '#f8f9fa',
                            color: isCurrent ? '#fff' : isDone ? '#2e7d32' : '#adb5bd',
                            fontWeight: isCurrent ? 700 : 500, fontSize: 13,
                            position: 'relative',
                          }}>
                          {isDone && !isCurrent ? <Check size={13} style={{ marginLeft: 3 }} /> : <span style={{ marginLeft: 3 }}>{step.icon}</span>}
                          {step.label}
                          {isCurrent && <span style={{ position: 'absolute', bottom: 0, right: '50%', transform: 'translateX(50%)', width: '40%', height: 3, background: '#fff', borderRadius: 2 }} />}
                        </button>
                        {i < WIZARD_STEPS.length - 1 && <div style={{ width: 1, background: '#dee2e6' }} />}
                      </React.Fragment>
                    )
                  })}
                </div>
                <hr className="mt-0 mb-0" />
              </div>

              {/* Step Content */}
              <div className="card-body p-4">
                {error && <div className="alert alert-danger mb-3"><strong>שגיאה:</strong> {error}</div>}
                {success && <div className="alert alert-success mb-3"><strong>הצלחה!</strong> המשתמש נוצר. מעביר לאשף הקליטה...</div>}

                {/* ─ Step 1: חשבון ─ */}
                {currentStep === 1 && (
                  <div>
                    <p className="text-muted small mb-3">פרטי כניסה למערכת Hostly.</p>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">אימייל <span className="text-danger">*</span></label>
                      <input type="email" className="form-control" value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)} placeholder="user@example.com" autoFocus />
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">סיסמה <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <input type={showPassword ? 'text' : 'password'} className="form-control"
                          value={formData.password} onChange={(e) => handleChange('password', e.target.value)}
                          minLength={6} placeholder="לפחות 6 תווים" />
                        <button type="button" className="btn btn-link text-secondary px-2" onClick={() => setShowPassword(v => !v)}>
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button type="button" className="btn btn-link text-secondary px-2" onClick={() => handleChange('password', generatePassword())} title="צור סיסמה">
                          <RefreshCw size={16} />
                        </button>
                      </div>
                      <small className="text-muted">סיסמה נוצרה אוטומטית — ניתן לשנות</small>
                    </div>
                    <div className="d-flex justify-content-end mt-4">
                      <button type="button" className="btn btn-primary" onClick={markCompleteAndNext} disabled={!canStep1}
                        style={{ background: 'var(--hb)', border: 'none' }}>
                        הבא ←
                      </button>
                    </div>
                  </div>
                )}

                {/* ─ Step 2: פרטים ─ */}
                {currentStep === 2 && (
                  <div>
                    <p className="text-muted small mb-3">פרטי הלקוח והיחידה.</p>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">שם תצוגה (שם היחידה) <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" value={formData.displayName}
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
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setCurrentStep(1)}>→ חזור</button>
                      <button type="button" className="btn btn-success fw-bold px-4"
                        onClick={handleSubmit} disabled={loading || !canStep2}>
                        {loading
                          ? <><span className="spinner-border spinner-border-sm me-2" />יוצר...</>
                          : '✅ צור משתמש והמשך לקליטה'}
                      </button>
                    </div>
                    <p className="text-muted small mt-3 mb-0">
                      אחרי היצירה תועבר לאשף הקליטה: נכס וחדר ב-Beds24, מחיר, חיבור ערוצים והפעלה.
                    </p>
                  </div>
                )}

              </div>
            </div>

            <div className="alert alert-warning mt-4">
              <strong>⚠️ חשוב:</strong> לאחר יצירה, שלח למשתמש:
              <ul className="mb-0 mt-1">
                <li>כתובת כניסה: <code>{process.env.NEXT_PUBLIC_BASE_URL ?? ''}/</code></li>
                <li>אימייל + סיסמה</li>
              </ul>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
