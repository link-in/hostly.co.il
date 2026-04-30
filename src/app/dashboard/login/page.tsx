'use client'

import React, { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

const LoginForm = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'
    await signIn('google', { callbackUrl })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (result?.error) {
        setError('אימייל או סיסמה שגויים')
        return
      }
      if (result?.ok) {
        const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'
        router.push(callbackUrl)
      }
    } catch {
      setError('שגיאה בהתחברות. נסה שוב.')
    } finally {
      setLoading(false)
    }
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
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            padding: '40px 36px',
          }}
        >
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <img
              src="/photos/hostly-logo.png"
              alt="Hostly"
              width={80}
              height={80}
              style={{ objectFit: 'contain', display: 'block', margin: '0 auto 16px' }}
            />
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                margin: '0 0 6px',
              }}
            >
              התחברות למערכת
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              הזן את פרטי ההתחברות שלך
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                borderRadius: '10px',
                padding: '12px 16px',
                fontSize: '14px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '6px',
                }}
              >
                אימייל <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '2px solid #e5e7eb',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  backgroundColor: loading ? '#f9fafb' : 'white',
                }}
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '6px',
                }}
              >
                סיסמה <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '2px solid #e5e7eb',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  backgroundColor: loading ? '#f9fafb' : 'white',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                background: loading
                  ? '#cbd5e1'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 12px rgba(102,126,234,0.35)',
              }}
            >
              {loading ? 'מתחבר...' : 'התחבר'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ position: 'relative', margin: '20px 0', textAlign: 'center' }}>
            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: 0 }} />
            <span
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'white',
                padding: '0 12px',
                fontSize: '13px',
                color: '#9ca3af',
              }}
            >
              או
            </span>
          </div>

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            style={{
              width: '100%',
              padding: '12px',
              background: 'white',
              border: '2px solid #e5e7eb',
              borderRadius: '10px',
              color: '#374151',
              fontSize: '15px',
              fontWeight: '600',
              cursor: googleLoading || loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              marginBottom: '12px',
              opacity: googleLoading || loading ? 0.7 : 1,
            }}
          >
            {googleLoading ? (
              <span
                style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid #667eea',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
            ) : (
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            )}
            {googleLoading ? 'מתחבר...' : 'כניסה עם Google'}
          </button>

          {/* Demo Link */}
          <a
            href="/demo"
            style={{
              display: 'block',
              padding: '11px',
              background: 'white',
              border: '2px solid #e5e7eb',
              borderRadius: '10px',
              color: '#667eea',
              fontSize: '14px',
              fontWeight: '600',
              textDecoration: 'none',
              textAlign: 'center',
            }}
          >
            כניסה למצב דמו 🎭
          </a>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}

const LoginPage = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <LoginForm />
  </Suspense>
)

export default LoginPage
