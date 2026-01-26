'use client'

import React, { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

const LoginForm = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
        setLoading(false)
        return
      }

      if (result?.ok) {
        const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (err) {
      setError('שגיאה בהתחברות. נסה שוב.')
      setLoading(false)
    }
  }

  return (
    <main 
      style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }} 
      dir="rtl"
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-6 col-lg-4">
            <div 
              className="card border-0"
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
              }}
            >
              <div className="card-body p-4 p-md-5">
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <img
                      src="/photos/hostly-logo.png"
                      alt="Hostly Logo"
                      width={80}
                      height={80}
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                  <h1 
                    className="h4 fw-bold mb-2"
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    התחברות למערכת
                  </h1>
                  <p className="text-muted small mb-0">הזן את פרטי ההתחברות שלך</p>
                </div>

                {error ? (
                  <div 
                    className="alert alert-danger mb-4" 
                    role="alert"
                    style={{
                      borderRadius: '8px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      border: '1px solid #f8d7da',
                      backgroundColor: '#f8d7da',
                      color: '#721c24'
                    }}
                  >
                    {error}
                  </div>
                ) : null}

                <style jsx>{`
                  input.form-control:focus {
                    border-color: #667eea !important;
                    box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25) !important;
                  }
                `}</style>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label small fw-semibold">
                      אימייל <span className="text-danger">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="form-control"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      disabled={loading}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        fontSize: '15px'
                      }}
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="password" className="form-label small fw-semibold">
                      סיסמה <span className="text-danger">*</span>
                    </label>
                    <input
                      id="password"
                      type="password"
                      className="form-control"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      disabled={loading}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        fontSize: '15px'
                      }}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn w-100"
                    disabled={loading}
                    style={{
                      background: loading 
                        ? '#cbd5e1' 
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      color: 'white',
                      padding: '12px',
                      fontSize: '16px',
                      fontWeight: '600',
                      borderRadius: '8px',
                      transition: 'all 0.3s ease',
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(102, 126, 234, 0.4)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }
                    }}
                  >
                    {loading ? 'מתחבר...' : 'התחבר'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

const LoginPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}

export default LoginPage
