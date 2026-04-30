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
  const [googleLoading, setGoogleLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'
    await signIn('google', { callbackUrl })
  }

  // Progress animation during login
  React.useEffect(() => {
    if (loading) {
      setProgress(0)
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev
          return prev + Math.random() * 15
        })
      }, 150)
      return () => clearInterval(interval)
    } else {
      setProgress(0)
    }
  }, [loading])

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
      }
    } catch (err) {
      setError('שגיאה בהתחברות. נסה שוב.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Custom Animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes floating {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .progress-container {
          animation: slideIn 0.3s ease-out forwards;
        }

        .card-login {
          animation: fadeInUp 0.8s ease-out forwards;
        }

        .hover-lift {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .hover-lift:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15) !important;
        }

        .floating-logo {
          animation: floating 3s ease-in-out infinite;
        }

        input.form-control {
          transition: all 0.3s ease;
        }

        input.form-control:focus {
          border-color: #667eea !important;
          box-shadow: 0 0 0 0.25rem rgba(102, 126, 234, 0.15) !important;
          transform: translateY(-2px);
        }
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
          overflow: 'hidden'
        }} 
        dir="rtl"
      >
        {/* Animated Background Elements */}
        <div style={{
          position: 'absolute',
          top: '10%',
          right: '10%',
          width: '300px',
          height: '300px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          animation: 'floating 6s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '10%',
          left: '10%',
          width: '250px',
          height: '250px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '50%',
          filter: 'blur(50px)',
          animation: 'floating 8s ease-in-out infinite',
          animationDelay: '1s'
        }} />

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="row justify-content-center">
            <div className="col-12 col-md-6 col-lg-4">
              <div 
                className="card border-0 card-login hover-lift"
                style={{
                  backgroundColor: 'white',
                  borderRadius: '20px',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
                }}
              >
              <div className="card-body p-4 p-md-5">
                <div className="text-center mb-4">
                  <div className="mb-3 floating-logo">
                    <img
                      src="/photos/hostly-logo.png"
                      alt="Hostly Logo"
                      width={90}
                      height={90}
                      style={{ 
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 4px 12px rgba(102, 126, 234, 0.15))'
                      }}
                    />
                  </div>
                  <h1 
                    className="h3 fw-bold mb-2"
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      fontSize: 'clamp(1.5rem, 5vw, 2rem)'
                    }}
                  >
                    התחברות למערכת
                  </h1>
                  <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                    הזן את פרטי ההתחברות שלך
                  </p>
                </div>

                {error ? (
                  <div 
                    className="alert alert-danger mb-4" 
                    role="alert"
                    style={{
                      borderRadius: '12px',
                      padding: '14px 16px',
                      fontSize: '14px',
                      border: '1px solid #fecaca',
                      background: 'linear-gradient(135deg, #fee2e215 0%, #fecaca15 100%)',
                      color: '#991b1b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      animation: 'fadeInUp 0.4s ease-out'
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>⚠️</span>
                    <span>{error}</span>
                  </div>
                ) : null}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label fw-semibold" style={{ 
                      fontSize: '14px',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      אימייל <span style={{ color: '#dc2626' }}>*</span>
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
                        padding: '14px 16px',
                        borderRadius: '12px',
                        fontSize: '15px',
                        border: '2px solid #e5e7eb',
                        backgroundColor: loading ? '#f9fafb' : 'white'
                      }}
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="password" className="form-label fw-semibold" style={{ 
                      fontSize: '14px',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      סיסמה <span style={{ color: '#dc2626' }}>*</span>
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
                        padding: '14px 16px',
                        borderRadius: '12px',
                        fontSize: '15px',
                        border: '2px solid #e5e7eb',
                        backgroundColor: loading ? '#f9fafb' : 'white'
                      }}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn w-100"
                    disabled={loading}
                    style={{
                      background: loading 
                        ? 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)' 
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      color: 'white',
                      padding: '14px',
                      fontSize: '16px',
                      fontWeight: '600',
                      borderRadius: '12px',
                      transition: 'all 0.3s ease',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: loading ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.3)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)'
                      }
                    }}
                  >
                    {loading ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <span style={{ 
                          width: '18px', 
                          height: '18px', 
                          border: '2px solid white',
                          borderTop: '2px solid transparent',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                          display: 'inline-block'
                        }} />
                        מתחבר...
                      </span>
                    ) : (
                      '🔐 התחבר'
                    )}
                  </button>

                  {/* Progress Bar */}
                  {loading && (
                    <div className="progress-container" style={{
                      marginTop: '16px',
                      padding: '12px',
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                      }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#667eea'
                        }}>
                          מתחבר...
                        </span>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#667eea'
                        }}>
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <div style={{
                        height: '6px',
                        background: '#f3f4f6',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        position: 'relative'
                      }}>
                        <div style={{
                          height: '100%',
                          background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                          width: `${progress}%`,
                          transition: 'width 0.3s ease',
                          boxShadow: '0 0 10px rgba(102, 126, 234, 0.5)',
                          borderRadius: '3px'
                        }} />
                      </div>
                    </div>
                  )}
                </form>

                {/* Demo Mode Link */}
                <div className="text-center mt-4">
                  <div style={{
                    position: 'relative',
                    marginBottom: '16px'
                  }}>
                    <hr style={{ 
                      margin: '0',
                      border: 'none',
                      borderTop: '1px solid #e5e7eb'
                    }} />
                    <span style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: 'white',
                      padding: '0 12px',
                      fontSize: '13px',
                      color: '#9ca3af',
                      fontWeight: '500'
                    }}>
                      או
                    </span>
                  </div>

                  {/* Google Sign-In Button */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading || loading}
                    className="btn w-100"
                    style={{
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      color: '#374151',
                      padding: '12px',
                      fontSize: '15px',
                      fontWeight: '600',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      marginBottom: '12px',
                      cursor: (googleLoading || loading) ? 'not-allowed' : 'pointer',
                      opacity: (googleLoading || loading) ? 0.7 : 1,
                      transition: 'all 0.3s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    }}
                    onMouseEnter={(e) => {
                      if (!googleLoading && !loading) {
                        e.currentTarget.style.borderColor = '#667eea'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    {googleLoading ? (
                      <span style={{ 
                        width: '18px', height: '18px',
                        border: '2px solid #667eea',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        display: 'inline-block'
                      }} />
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        <path fill="none" d="M0 0h48v48H0z"/>
                      </svg>
                    )}
                    {googleLoading ? 'מתחבר...' : 'כניסה עם Google'}
                  </button>

                  <div style={{
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                    padding: '16px',
                    borderRadius: '12px',
                    marginBottom: '12px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <p className="mb-2" style={{ 
                      fontSize: '13px',
                      color: '#6b7280',
                      fontWeight: '500'
                    }}>
                      💡 רוצה לנסות את המערכת?
                    </p>
                    <a 
                      href="/demo"
                      className="btn w-100"
                      style={{
                        background: 'white',
                        border: '2px solid #e5e7eb',
                        color: '#667eea',
                        padding: '12px',
                        fontSize: '15px',
                        fontWeight: '600',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#667eea'
                        e.currentTarget.style.background = 'linear-gradient(135deg, #667eea05 0%, #764ba205 100%)'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e5e7eb'
                        e.currentTarget.style.background = 'white'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>🎭</span>
                      <span>כניסה מהירה למצב דמו</span>
                    </a>
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

const LoginPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}

export default LoginPage
