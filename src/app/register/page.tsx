'use client'

import React, { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '10px',
  border: '2px solid #e5e7eb',
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box',
}

function RegisterForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (form.password !== form.confirmPassword) {
      setError('הסיסמאות אינן תואמות')
      return
    }

    setLoading(true)
    try {
      // 1. Create account
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          displayName: form.displayName,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'שגיאה ביצירת החשבון')
        return
      }

      // 2. Sign in automatically
      const result = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      })
      if (result?.error) {
        setError('החשבון נוצר אך ההתחברות נכשלה — נסה להתחבר ידנית')
        return
      }

      // 3. Store credentials temporarily for onboarding display (cleared immediately after reading)
      sessionStorage.setItem('hostly_reg_creds', JSON.stringify({ email: form.email, password: form.password }))

      // 4. Go to onboarding
      router.push('/dashboard/onboarding')
    } catch {
      setError('שגיאה בהרשמה, נסה שוב')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    await signIn('google', { callbackUrl: '/dashboard/onboarding' })
  }

  return (
    <main
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: '40px 36px' }}>

          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
            <img src="/photos/hostly-logo.png" alt="Hostly" width={70} height={70} style={{ objectFit: 'contain', marginBottom: '14px' }} />
            <h1 style={{ fontSize: '1.65rem', fontWeight: '700', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: '0 0 4px', textAlign: 'center' }}>
              יצירת חשבון
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0, textAlign: 'center' }}>
              14 יום ניסיון חינם — ללא כרטיס אשראי
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '10px', padding: '12px 16px', fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            style={{ width: '100%', padding: '12px', background: 'white', border: '2px solid #e5e7eb', borderRadius: '10px', color: '#374151', fontSize: '15px', fontWeight: '600', cursor: googleLoading || loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '16px', opacity: googleLoading || loading ? 0.7 : 1 }}
          >
            {googleLoading ? (
              <span style={{ width: '18px', height: '18px', border: '2px solid #667eea', borderTop: '2px solid transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            )}
            {googleLoading ? 'מתחבר...' : 'הרשמה עם Google'}
          </button>

          {/* Divider */}
          <div style={{ position: 'relative', margin: '0 0 16px', textAlign: 'center' }}>
            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: 0 }} />
            <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', padding: '0 12px', fontSize: '13px', color: '#9ca3af' }}>
              או
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                שם תצוגה <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="שם הנכס שלך"
                value={form.displayName}
                onChange={(e) => set('displayName', e.target.value)}
                required
                disabled={loading}
                style={inputStyle}
              />
              <small style={{ color: '#9ca3af', fontSize: '12px' }}>לדוגמה: דירת חוף תל אביב</small>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                אימייל <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                required
                disabled={loading}
                style={{ ...inputStyle, direction: 'ltr' }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                סיסמה <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="password"
                placeholder="לפחות 6 תווים"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                required
                minLength={6}
                disabled={loading}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                אימות סיסמה <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="password"
                placeholder="הזן שוב את הסיסמה"
                value={form.confirmPassword}
                onChange={(e) => set('confirmPassword', e.target.value)}
                required
                disabled={loading}
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '13px', background: loading ? '#cbd5e1' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 12px rgba(102,126,234,0.35)' }}
            >
              {loading ? 'יוצר חשבון...' : 'צור חשבון חינמי'}
            </button>
          </form>

          {/* Login link */}
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#6b7280' }}>
            יש לך כבר חשבון?{' '}
            <Link href="/" style={{ color: '#667eea', fontWeight: '600', textDecoration: 'none' }}>
              התחבר כאן
            </Link>
          </p>
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </main>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div />}>
      <RegisterForm />
    </Suspense>
  )
}
