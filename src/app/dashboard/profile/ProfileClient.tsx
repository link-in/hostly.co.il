'use client'

import React, { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import DashboardHeader from '@/components/DashboardHeader'

const ProfileClient = () => {
  const { data: session, update } = useSession()
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

  // Custom styles for inputs
  const inputStyle = {
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    padding: '0.6rem',
    transition: 'all 0.2s ease',
  }

  // Update form fields when session loads
  useEffect(() => {
    if (session?.user) {
      setDisplayName(session.user.displayName ?? '')
      setEmail(session.user.email ?? '')
      setLandingPageUrl(session.user.landingPageUrl ?? '')
      setPhoneNumber(session.user.phoneNumber ?? '')
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
        phoneNumber: phoneNumber.trim()
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
                      placeholder="+972501234567"
                      dir="ltr"
                    />
                    <small className="text-muted">
                      מספר טלפון עם קידומת מדינה (לדוגמה: +972501234567) לקבלת התראות על הזמנות חדשות ב-WhatsApp
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
