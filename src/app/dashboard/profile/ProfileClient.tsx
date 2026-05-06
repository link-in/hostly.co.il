'use client'

import React, { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink, Loader2 } from 'lucide-react'
import DashboardHeader from '@/components/DashboardHeader'

interface SubscriptionInfo {
  status: 'trial' | 'active' | 'cancelled' | 'expired'
  planId: string | null
  billingCycle: 'monthly' | 'annual' | null
  daysRemaining: number
  expiresAt: string | null
}

const ProfileClient = () => {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [landingPageUrl, setLandingPageUrl] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Subscription state
  const [sub, setSub] = useState<SubscriptionInfo | null>(null)
  const [subLoading, setSubLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  
  // Airbnb connect
  const [airbnbLinking, setAirbnbLinking] = useState(false)
  const [airbnbLinkError, setAirbnbLinkError] = useState<string | null>(null)
  const [airbnbLinkSuccess, setAirbnbLinkSuccess] = useState(false)

  // Check-in settings
  const [wifiSsid, setWifiSsid] = useState('')
  const [wifiPassword, setWifiPassword] = useState('')
  const [propertyGuideUrl, setPropertyGuideUrl] = useState('')
  const [termsText, setTermsText] = useState('')
  const [liabilityWaiverText, setLiabilityWaiverText] = useState('')
  const [defaultAccessCode, setDefaultAccessCode] = useState('')

  // Custom styles for inputs
  const inputStyle = {
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    padding: '0.6rem',
    transition: 'all 0.2s ease',
  }

  // Load subscription info
  useEffect(() => {
    if (!session?.user) return
    if (session.user.role === 'admin' || session.user.isDemo) {
      setSubLoading(false)
      return
    }
    fetch('/api/dashboard/subscription')
      .then((r) => r.json())
      .then((data) => setSub(data))
      .catch(() => null)
      .finally(() => setSubLoading(false))
  }, [session])

  const handleConnectAirbnb = async () => {
    setAirbnbLinkError(null)
    setAirbnbLinkSuccess(false)
    setAirbnbLinking(true)
    try {
      const res = await fetch('/api/dashboard/beds24/airbnb-auth-url')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'שגיאה בקבלת קישור Airbnb')
      window.open(data.url, '_blank', 'noopener,noreferrer')
      setAirbnbLinkSuccess(true)
    } catch (err) {
      setAirbnbLinkError(err instanceof Error ? err.message : 'שגיאה לא ידועה')
    } finally {
      setAirbnbLinking(false)
    }
  }

  const handleCancelSubscription = async () => {
    setCancelling(true)
    try {
      const res = await fetch('/api/dashboard/subscription', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'ביטול נכשל')
      setSub((prev) => prev ? { ...prev, status: 'cancelled' } : prev)
      setShowCancelConfirm(false)
      setSuccess('המנוי בוטל בהצלחה. תוכל להמשיך להשתמש במערכת עד תאריך הפקיעה.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ביטול נכשל')
    } finally {
      setCancelling(false)
    }
  }

  // Update form fields when session loads
  useEffect(() => {
    if (session?.user) {
      setDisplayName(session.user.displayName ?? '')
      setEmail(session.user.email ?? '')
      setLandingPageUrl(session.user.landingPageUrl ?? '')
      setPhoneNumber(session.user.phoneNumber ?? '')
      
      // Load check-in settings
      const settings = session.user.checkInSettings
      if (settings) {
        setWifiSsid(settings.wifi_ssid ?? '')
        setWifiPassword(settings.wifi_password ?? '')
        setPropertyGuideUrl(settings.property_guide_url ?? '')
        setTermsText(settings.terms_text ?? '')
        setLiabilityWaiverText(settings.liability_waiver_text ?? '')
        setDefaultAccessCode(settings.default_access_code ?? '')
      }
    }
  }, [session])

  const handleSave = async () => {
    setError(null)
    setSuccess(null)

    if (!displayName.trim()) {
      setError('יש להזין שם תצוגה')
      return
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError('הסיסמאות אינן תואמות')
      return
    }

    if (newPassword && newPassword.length < 6) {
      setError('סיסמה חדשה חייבת להכיל לפחות 6 תווים')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim(),
          landingPageUrl: landingPageUrl.trim(),
          phoneNumber: phoneNumber.trim(),
          checkInSettings: {
            wifi_ssid: wifiSsid.trim(),
            wifi_password: wifiPassword.trim(),
            property_guide_url: propertyGuideUrl.trim(),
            terms_text: termsText.trim(),
            liability_waiver_text: liabilityWaiverText.trim(),
            default_access_code: defaultAccessCode.trim(),
          },
          ...(newPassword ? { currentPassword, newPassword } : {}),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'עדכון נכשל')
      }

      const responseData = await response.json()
      
      // Update session with new data
      await update({ 
        displayName: displayName.trim(),
        landingPageUrl: landingPageUrl.trim(),
        phoneNumber: phoneNumber.trim(),
        checkInSettings: {
          wifi_ssid: wifiSsid.trim(),
          wifi_password: wifiPassword.trim(),
          property_guide_url: propertyGuideUrl.trim(),
          terms_text: termsText.trim(),
          liability_waiver_text: liabilityWaiverText.trim(),
          default_access_code: defaultAccessCode.trim(),
        }
      })
      
      setSuccess('הפרטים עודכנו בהצלחה')
      setEditing(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'עדכון נכשל')
    } finally {
      setSaving(false)
    }
  }

  const styles = `
    .profile-input:focus {
      border-color: #667eea !important;
      box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25) !important;
      outline: none;
    }
    
    .profile-input:disabled {
      background-color: #f8f9fa !important;
      opacity: 0.7;
    }

    .profile-btn-gradient {
      transition: all 0.3s ease;
    }

    .profile-btn-gradient:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4) !important;
    }

    .profile-btn-gradient:active:not(:disabled) {
      transform: translateY(0);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `

  if (!session?.user) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <main 
          style={{ 
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          }} 
          dir="rtl"
        >
          <div className="container py-5">
            <div className="text-center text-white">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">טוען...</span>
              </div>
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <main 
        style={{ 
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        }} 
        dir="rtl"
      >
        <div className="container py-3 py-md-5">
          <div className="row justify-content-center">
            <div className="col-lg-10">
              <div className="mb-3 mb-md-4">
                <DashboardHeader 
                  session={session}
                  showLandingPageButton={true}
                  currentPage="profile"
                />
              </div>
            </div>
          </div>

          <div className="row justify-content-center">
            <div className="col-lg-10">
              <div 
                className="card border-0 shadow-lg"
                style={{ borderRadius: '16px' }}
              >
              <div 
                className="card-header border-0 text-center py-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(249, 147, 251, 0.1) 100%)',
                  borderRadius: '16px 16px 0 0',
                }}
              >
                <h1 
                  className="h3 fw-bold mb-0"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  👤 איזור אישי
                </h1>
              </div>
              <div className="card-body p-4">

                {error ? (
                  <div 
                    className="alert alert-danger py-3 mb-4 shadow-sm" 
                    role="alert"
                    style={{
                      borderRadius: '12px',
                      border: 'none',
                    }}
                  >
                    ⚠️ {error}
                  </div>
                ) : null}

                {success ? (
                  <div 
                    className="alert alert-success py-3 mb-4 shadow-sm" 
                    role="alert"
                    style={{
                      borderRadius: '12px',
                      border: 'none',
                    }}
                  >
                    ✅ {success}
                  </div>
                ) : null}

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold" style={{ color: '#667eea' }}>
                      🏷️ שם תצוגה
                    </label>
                    <input
                      type="text"
                      className="form-control shadow-sm profile-input"
                      style={inputStyle}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={!editing}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" style={{ color: '#667eea' }}>
                      📧 אימייל
                    </label>
                    <input
                      type="email"
                      className="form-control shadow-sm profile-input"
                      style={inputStyle}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!editing}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" style={{ color: '#667eea' }}>
                      🌐 כתובת דף נחיתה
                    </label>
                    <input
                      type="url"
                      className="form-control shadow-sm profile-input"
                      style={inputStyle}
                      value={landingPageUrl}
                      onChange={(e) => setLandingPageUrl(e.target.value)}
                      disabled={!editing}
                      placeholder="https://example.com"
                    />
                    <small className="text-muted">כתובת URL של דף הנחיתה של היחידה</small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" style={{ color: '#667eea' }}>
                      📱 מספר WhatsApp לקבלת התראות 
                      <span className="text-danger">*</span>
                    </label>
                    <input
                      type="tel"
                      className="form-control shadow-sm profile-input"
                      style={inputStyle}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={!editing}
                      placeholder="0528676516"
                      dir="ltr"
                    />
                    <small className="text-muted">
                      הכנס מספר טלפון ישראלי - המערכת תמיר אוטומטית לפורמט בינלאומי
                    </small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted">
                      🏠 Property ID
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0',
                        padding: '0.6rem',
                        backgroundColor: '#f8f9fa',
                      }}
                      value={session.user.propertyId}
                      disabled
                      readOnly
                    />
                    <small className="text-muted">🔒 לא ניתן לעריכה - קשור ל-Beds24</small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted">
                      🚪 Room ID
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0',
                        padding: '0.6rem',
                        backgroundColor: '#f8f9fa',
                      }}
                      value={session.user.roomId}
                      disabled
                      readOnly
                    />
                    <small className="text-muted">🔒 לא ניתן לעריכה - קשור ל-Beds24</small>
                  </div>

                  {/* ── Airbnb Channel Connection ── */}
                  {session.user.propertyId && (
                    <div className="col-12">
                      <div
                        className="p-3 rounded-3"
                        style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}
                      >
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                          <div>
                            <div className="fw-semibold" style={{ color: '#c2410c' }}>
                              חיבור חשבון Airbnb
                            </div>
                            <small className="text-muted">
                              חבר את הנכס שלך לAirbnb דרך Beds24 — יפתח דף הרשאה בחלון חדש
                            </small>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm fw-bold d-flex align-items-center gap-2"
                            style={{ background: '#ff5a5f', color: '#fff', border: 'none', whiteSpace: 'nowrap' }}
                            disabled={airbnbLinking}
                            onClick={handleConnectAirbnb}
                          >
                            {airbnbLinking
                              ? <><Loader2 size={14} style={{ animation: 'spin .8s linear infinite' }} /> מחפש קישור...</>
                              : <><ExternalLink size={14} /> חבר Airbnb</>}
                          </button>
                        </div>
                        {airbnbLinkError && (
                          <div className="alert alert-danger mb-0 mt-2 py-2 small">{airbnbLinkError}</div>
                        )}
                        {airbnbLinkSuccess && (
                          <div className="alert alert-success mb-0 mt-2 py-2 small">
                            ✓ נפתח דף ההרשאה של Airbnb. לאחר אישור, הנכס יהיה מחובר אוטומטית.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Check-in Settings Section */}
                  <div className="col-12">
                    <hr 
                      className="my-4" 
                      style={{
                        background: 'linear-gradient(90deg, transparent, #667eea, transparent)',
                        height: '2px',
                        border: 'none',
                      }}
                    />
                    <h3 
                      className="h5 fw-bold mb-3"
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      ⭐ הגדרות צ'ק-אין דיגיטלי
                    </h3>
                    <p className="text-muted small mb-3">
                      הגדרות אלו ישמשו לצ'ק-אין דיגיטלי של אורחים. אם לא תמלא פרטים, ייעשה שימוש בברירות מחדל.
                    </p>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" style={{ color: '#667eea' }}>
                      📶 שם רשת WiFi (SSID)
                    </label>
                    <input
                      type="text"
                      className="form-control shadow-sm profile-input"
                      style={inputStyle}
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      disabled={!editing}
                      placeholder="שם הרשת שלך"
                    />
                    <small className="text-muted">יישלח לאורח אוטומטית אחרי צ'ק-אין</small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" style={{ color: '#667eea' }}>
                      🔑 סיסמת WiFi
                    </label>
                    <input
                      type="text"
                      className="form-control shadow-sm profile-input"
                      style={inputStyle}
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      disabled={!editing}
                      placeholder="סיסמת הרשת שלך"
                    />
                    <small className="text-muted">יישלח לאורח אוטומטית אחרי צ'ק-אין</small>
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold" style={{ color: '#667eea' }}>
                      📄 קישור למדריך הנכס (URL)
                    </label>
                    <input
                      type="url"
                      className="form-control shadow-sm profile-input"
                      style={inputStyle}
                      value={propertyGuideUrl}
                      onChange={(e) => setPropertyGuideUrl(e.target.value)}
                      disabled={!editing}
                      placeholder="https://drive.google.com/... או קישור אחר"
                    />
                    <small className="text-muted">קישור למדריך נכס מלא (PDF, Google Drive, וכו')</small>
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold" style={{ color: '#667eea' }}>
                      🚪 קוד כניסה ברירת מחדל
                    </label>
                    <input
                      type="text"
                      className="form-control shadow-sm profile-input"
                      style={inputStyle}
                      value={defaultAccessCode}
                      onChange={(e) => setDefaultAccessCode(e.target.value)}
                      disabled={!editing}
                      placeholder="1234 או #1234*"
                    />
                    <small className="text-muted">קוד קבוע למנעול הדירה (אם לא משתמש בקודים דינמיים)</small>
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold" style={{ color: '#667eea' }}>
                      📜 תנאי אירוח מותאמים אישית
                    </label>
                    <textarea
                      className="form-control shadow-sm profile-input"
                      style={{ ...inputStyle, minHeight: '120px' }}
                      value={termsText}
                      onChange={(e) => setTermsText(e.target.value)}
                      disabled={!editing}
                      placeholder="השאר ריק לשימוש בתנאי ברירת מחדל המשפטיים, או כתוב תנאים מותאמים אישית בפורמט HTML..."
                    />
                    <small className="text-muted">
                      השאר ריק לשימוש בתנאים המשפטיים המלאים (מומלץ). אם תרצה להוסיף תנאים נוספים, כתוב אותם בפורמט HTML והם יוצגו במקום התנאים הדיפולטיים.
                    </small>
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold" style={{ color: '#667eea' }}>
                      ⚠️ כתב ויתור אחריות מותאם אישית
                    </label>
                    <textarea
                      className="form-control shadow-sm profile-input"
                      style={{ ...inputStyle, minHeight: '120px' }}
                      value={liabilityWaiverText}
                      onChange={(e) => setLiabilityWaiverText(e.target.value)}
                      disabled={!editing}
                      placeholder="השאר ריק לשימוש בכתב ברירת מחדל, או כתוב נוסח מותאם אישית..."
                    />
                    <small className="text-muted">כתב ויתור אחריות שיופיע בטופס הצ'ק-אין</small>
                  </div>

                  {editing ? (
                    <>
                      <div className="col-12">
                        <hr 
                          className="my-4" 
                          style={{
                            background: 'linear-gradient(90deg, transparent, #667eea, transparent)',
                            height: '2px',
                            border: 'none',
                          }}
                        />
                        <h3 
                          className="h5 fw-bold mb-3"
                          style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}
                        >
                          🔐 שינוי סיסמה (אופציונלי)
                        </h3>
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-semibold" style={{ color: '#667eea' }}>
                          🔑 סיסמה נוכחית
                        </label>
                        <input
                          type="password"
                          className="form-control shadow-sm profile-input"
                          style={inputStyle}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="הזן סיסמה נוכחית"
                        />
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold" style={{ color: '#667eea' }}>
                          🆕 סיסמה חדשה
                        </label>
                        <input
                          type="password"
                          className="form-control shadow-sm profile-input"
                          style={inputStyle}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="לפחות 6 תווים"
                        />
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold" style={{ color: '#667eea' }}>
                          ✔️ אימות סיסמה
                        </label>
                        <input
                          type="password"
                          className="form-control shadow-sm profile-input"
                          style={inputStyle}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="הזן שוב"
                        />
                      </div>
                    </>
                  ) : null}

                  {/* Subscription Management Section */}
                  {session.user.role !== 'admin' && !session.user.isDemo ? (
                    <div className="col-12">
                      <hr
                        className="my-4"
                        style={{
                          background: 'linear-gradient(90deg, transparent, #667eea, transparent)',
                          height: '2px',
                          border: 'none',
                        }}
                      />
                      <h3
                        className="h5 fw-bold mb-3"
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        💳 ניהול מנוי
                      </h3>

                      {subLoading ? (
                        <div className="text-muted small">טוען פרטי מנוי...</div>
                      ) : !sub ? (
                        <div className="text-muted small">לא נמצא מנוי פעיל</div>
                      ) : (
                        <div
                          style={{
                            background: 'linear-gradient(135deg, rgba(102,126,234,0.06) 0%, rgba(249,147,251,0.06) 100%)',
                            border: '1px solid rgba(102,126,234,0.2)',
                            borderRadius: '12px',
                            padding: '20px 24px',
                          }}
                        >
                          <div className="d-flex flex-wrap gap-4 align-items-center mb-3">
                            <div>
                              <div className="text-muted small mb-1">סטטוס</div>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '4px 12px',
                                  borderRadius: '20px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  background:
                                    sub.status === 'active'
                                      ? '#dcfce7'
                                      : sub.status === 'trial'
                                        ? '#dbeafe'
                                        : sub.status === 'cancelled'
                                          ? '#fef3c7'
                                          : '#fee2e2',
                                  color:
                                    sub.status === 'active'
                                      ? '#15803d'
                                      : sub.status === 'trial'
                                        ? '#1d4ed8'
                                        : sub.status === 'cancelled'
                                          ? '#92400e'
                                          : '#b91c1c',
                                }}
                              >
                                {sub.status === 'active'
                                  ? 'פעיל'
                                  : sub.status === 'trial'
                                    ? 'ניסיון'
                                    : sub.status === 'cancelled'
                                      ? 'בוטל'
                                      : 'פג תוקף'}
                              </span>
                            </div>

                            {sub.billingCycle && (
                              <div>
                                <div className="text-muted small mb-1">תוכנית</div>
                                <strong style={{ color: '#374151' }}>
                                  {sub.billingCycle === 'monthly' ? 'חודשי — ₪150' : 'שנתי — ₪1,000'}
                                </strong>
                              </div>
                            )}

                            {sub.expiresAt && (
                              <div>
                                <div className="text-muted small mb-1">
                                  {sub.status === 'cancelled' ? 'גישה עד' : 'תוקף עד'}
                                </div>
                                <strong style={{ color: '#374151' }}>
                                  {new Date(sub.expiresAt).toLocaleDateString('he-IL')}
                                </strong>
                              </div>
                            )}

                            {sub.status === 'trial' && (
                              <div>
                                <div className="text-muted small mb-1">ימים שנותרו</div>
                                <strong style={{ color: sub.daysRemaining <= 3 ? '#b91c1c' : '#374151' }}>
                                  {sub.daysRemaining} ימים
                                </strong>
                              </div>
                            )}
                          </div>

                          <div className="d-flex gap-2 flex-wrap">
                            {(sub.status === 'trial' || sub.status === 'expired') && (
                              <button
                                type="button"
                                onClick={() => router.push('/dashboard/pricing')}
                                style={{
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '8px',
                                  padding: '8px 20px',
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                }}
                              >
                                שדרג עכשיו
                              </button>
                            )}

                            {sub.status === 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => router.push('/dashboard/pricing')}
                                style={{
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '8px',
                                  padding: '8px 20px',
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                }}
                              >
                                חדש מנוי
                              </button>
                            )}

                            {sub.status === 'active' && !showCancelConfirm && (
                              <button
                                type="button"
                                onClick={() => setShowCancelConfirm(true)}
                                style={{
                                  background: 'transparent',
                                  color: '#b91c1c',
                                  border: '1px solid #fca5a5',
                                  borderRadius: '8px',
                                  padding: '8px 20px',
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                }}
                              >
                                ביטול מנוי
                              </button>
                            )}
                          </div>

                          {showCancelConfirm && sub.status === 'active' && (
                            <div
                              style={{
                                marginTop: '16px',
                                background: '#fff7ed',
                                border: '1px solid #fed7aa',
                                borderRadius: '10px',
                                padding: '16px',
                              }}
                            >
                              <p style={{ fontSize: '14px', color: '#92400e', marginBottom: '12px' }}>
                                האם אתה בטוח שברצונך לבטל את המנוי?
                                <br />
                                <span style={{ fontSize: '13px', color: '#a16207' }}>
                                  תוכל להמשיך להשתמש במערכת עד{' '}
                                  {sub.expiresAt
                                    ? new Date(sub.expiresAt).toLocaleDateString('he-IL')
                                    : 'תאריך הפקיעה'}
                                </span>
                              </p>
                              <div className="d-flex gap-2">
                                <button
                                  type="button"
                                  onClick={handleCancelSubscription}
                                  disabled={cancelling}
                                  style={{
                                    background: '#b91c1c',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '7px 18px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: cancelling ? 'not-allowed' : 'pointer',
                                    opacity: cancelling ? 0.7 : 1,
                                  }}
                                >
                                  {cancelling ? 'מבטל...' : 'כן, בטל מנוי'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowCancelConfirm(false)}
                                  style={{
                                    background: 'transparent',
                                    color: '#374151',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    padding: '7px 18px',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  חזור
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="col-12 d-flex gap-2 mt-4">
                    {editing ? (
                      <>
                        <button
                          type="button"
                          className="btn shadow profile-btn-gradient"
                          style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.5rem 1.5rem',
                            fontWeight: '500',
                          }}
                          onClick={handleSave}
                          disabled={saving}
                        >
                          {saving ? '⏳ שומר...' : '✅ שמירה'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary shadow-sm"
                          style={{
                            borderRadius: '8px',
                            padding: '0.5rem 1.5rem',
                            fontWeight: '500',
                          }}
                          onClick={() => {
                            setEditing(false)
                            setDisplayName(session?.user?.displayName ?? '')
                            setEmail(session?.user?.email ?? '')
                            setLandingPageUrl(session?.user?.landingPageUrl ?? '')
                            setPhoneNumber(session?.user?.phoneNumber ?? '')
                            
                            // Reset check-in settings
                            const settings = session?.user?.checkInSettings
                            setWifiSsid(settings?.wifi_ssid ?? '')
                            setWifiPassword(settings?.wifi_password ?? '')
                            setPropertyGuideUrl(settings?.property_guide_url ?? '')
                            setTermsText(settings?.terms_text ?? '')
                            setLiabilityWaiverText(settings?.liability_waiver_text ?? '')
                            setDefaultAccessCode(settings?.default_access_code ?? '')
                            
                            setCurrentPassword('')
                            setNewPassword('')
                            setConfirmPassword('')
                            setError(null)
                            setSuccess(null)
                          }}
                        >
                          ❌ ביטול
                        </button>
                      </>
                    ) : (
                      <button 
                        type="button" 
                        className="btn shadow profile-btn-gradient"
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.5rem 1.5rem',
                          fontWeight: '500',
                        }}
                        onClick={() => setEditing(true)}
                      >
                        ✏️ עריכת פרטים
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </main>
    </>
  )
}

export default ProfileClient
