'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import Image from 'next/image'

export default function HomeLanding() {
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    await signIn('google', { callbackUrl: '/dashboard' })
  }

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes floating {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .home-card { animation: fadeInUp 0.8s ease-out forwards; }
        .home-logo { animation: floating 3s ease-in-out infinite; }
      `}</style>

      <main
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'var(--font-rubik, sans-serif)',
        }}
        dir="rtl"
      >
        {/* Blurred background circles */}
        <div style={{
          position: 'absolute', top: '10%', right: '10%',
          width: '300px', height: '300px',
          background: 'rgba(255,255,255,0.1)', borderRadius: '50%',
          filter: 'blur(60px)', animation: 'floating 6s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', left: '10%',
          width: '250px', height: '250px',
          background: 'rgba(255,255,255,0.08)', borderRadius: '50%',
          filter: 'blur(50px)', animation: 'floating 8s ease-in-out infinite',
          animationDelay: '1s',
        }} />

        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px' }}>
          <div
            className="home-card"
            style={{
              backgroundColor: 'white',
              borderRadius: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              padding: '40px 36px',
              textAlign: 'center',
            }}
          >
            {/* Logo */}
            <div className="home-logo" style={{ marginBottom: '20px' }}>
              <Image
                src="/photos/hostly-logo.png"
                alt="Hostly"
                width={90}
                height={90}
                style={{ objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(102,126,234,0.15))' }}
              />
            </div>

            {/* Title */}
            <h1
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontSize: 'clamp(1.6rem, 5vw, 2rem)',
                fontWeight: 700,
                marginBottom: '8px',
              }}
            >
              Hostly
            </h1>
            <p style={{ color: '#6b7280', fontSize: '15px', marginBottom: '32px' }}>
              מערכת ניהול נכסים חכמה לטווח קצר
            </p>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              style={{
                width: '100%',
                background: 'white',
                border: '2px solid #e5e7eb',
                color: '#374151',
                padding: '14px 16px',
                fontSize: '16px',
                fontWeight: 600,
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                cursor: googleLoading ? 'not-allowed' : 'pointer',
                opacity: googleLoading ? 0.7 : 1,
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                marginBottom: '16px',
              }}
              onMouseEnter={(e) => {
                if (!googleLoading) {
                  e.currentTarget.style.borderColor = '#667eea'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(102,126,234,0.2)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
              }}
            >
              {googleLoading ? (
                <span style={{
                  width: '20px', height: '20px',
                  border: '2px solid #667eea',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  display: 'inline-block',
                }} />
              ) : (
                <svg width="22" height="22" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
              )}
              {googleLoading ? 'מתחבר...' : 'כניסה עם Google'}
            </button>

            {/* Divider */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <hr style={{ margin: 0, border: 'none', borderTop: '1px solid #e5e7eb' }} />
              <span style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'white', padding: '0 12px',
                fontSize: '13px', color: '#9ca3af', fontWeight: 500,
              }}>
                או
              </span>
            </div>

            {/* Login with email */}
            <a
              href="/dashboard/login"
              style={{
                display: 'block',
                width: '100%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                color: 'white',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 600,
                borderRadius: '14px',
                textDecoration: 'none',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(102,126,234,0.3)',
                marginBottom: '16px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(102,126,234,0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102,126,234,0.3)'
              }}
            >
              🔐 כניסה עם אימייל וסיסמה
            </a>

            {/* Demo link */}
            <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px', marginBottom: 0 }}>
              רוצה לנסות?{' '}
              <a href="/demo" style={{ color: '#667eea', fontWeight: 600, textDecoration: 'none' }}>
                כניסה למצב דמו
              </a>
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
