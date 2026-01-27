'use client'

import React, { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

/**
 * Auto-Login Demo Page - Enhanced Version
 * 
 * This page automatically logs in the demo user and redirects to dashboard.
 * Share this link: https://your-domain.com/demo
 * 
 * Demo credentials:
 * - Email: demo@hostly.co.il
 * - Password: demo2026
 */
const DemoAutoLoginPage = () => {
  const router = useRouter()
  const [status, setStatus] = useState<'connecting' | 'success' | 'error'>('connecting')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [progress, setProgress] = useState(0)
  const [demoUrl, setDemoUrl] = useState('/demo')

  // Set demo URL on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDemoUrl(`${window.location.origin}/demo`)
    }
  }, [])

  // Progress bar animation
  useEffect(() => {
    if (status === 'connecting') {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev
          return prev + Math.random() * 15
        })
      }, 200)
      return () => clearInterval(interval)
    } else if (status === 'success') {
      setProgress(100)
    }
  }, [status])

  // Auto login
  useEffect(() => {
    const autoLogin = async () => {
      try {
        setStatus('connecting')
        
        // Simulate slight delay for better UX
        await new Promise(resolve => setTimeout(resolve, 600))
        
        // Auto sign in with demo credentials
        const result = await signIn('credentials', {
          email: 'demo@hostly.co.il',
          password: 'demo2026',
          redirect: false,
        })

        if (result?.error) {
          console.error('Demo auto-login failed:', result.error)
          setStatus('error')
          setError('שגיאה בהתחברות למשתמש דמו. אנא נסה שוב מאוחר יותר.')
          return
        }

        if (result?.ok) {
          setStatus('success')
          // Small delay to show success message
          setTimeout(() => {
            router.push('/dashboard')
            router.refresh()
          }, 1000)
        }
      } catch (err) {
        console.error('Demo auto-login error:', err)
        setStatus('error')
        setError('שגיאה בהתחברות. אנא נסה שוב.')
      }
    }

    autoLogin()
  }, [router])

  // Copy to clipboard function
  const copyDemoLink = () => {
    navigator.clipboard.writeText(demoUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
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

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes progressBar {
          from {
            width: 0%;
          }
        }

        .fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }

        .pulse {
          animation: pulse 2s ease-in-out infinite;
        }

        .slide-in {
          animation: slideIn 0.5s ease-out forwards;
        }

        .scale-in {
          animation: scaleIn 0.5s ease-out forwards;
        }

        .card-demo {
          animation: fadeInUp 0.8s ease-out forwards;
        }

        .tooltip-copied {
          position: absolute;
          top: -35px;
          left: 50%;
          transform: translateX(-50%);
          background: #10b981;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          animation: fadeInUp 0.3s ease-out;
        }

        .tooltip-copied::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid #10b981;
        }

        .hover-lift {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .hover-lift:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15) !important;
        }

        .gradient-text {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .floating {
          animation: floating 3s ease-in-out infinite;
        }

        @keyframes floating {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
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
            <div className="col-12 col-md-6 col-lg-5">
              <div 
                className="card border-0 card-demo hover-lift"
                style={{
                  backgroundColor: 'white',
                  borderRadius: '20px',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
                  overflow: 'hidden'
                }}
              >
                {/* Progress Bar */}
                {status === 'connecting' && (
                  <div style={{
                    height: '4px',
                    background: '#f3f4f6',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                      width: `${progress}%`,
                      transition: 'width 0.3s ease',
                      boxShadow: '0 0 10px rgba(102, 126, 234, 0.5)'
                    }} />
                  </div>
                )}

                <div className="card-body p-4 p-md-5 text-center">
                {/* Logo */}
                <div className="mb-4 floating">
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

                {/* Connecting State */}
                {status === 'connecting' && (
                  <div className="fade-in-up">
                    <div className="mb-4">
                      <div 
                        style={{
                          width: '70px',
                          height: '70px',
                          margin: '0 auto',
                          position: 'relative'
                        }}
                      >
                        {/* Outer spinning circle */}
                        <div style={{
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          border: '4px solid #f3f4f6',
                          borderTop: '4px solid #667eea',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                        {/* Inner pulsing circle */}
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '50px',
                          height: '50px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          borderRadius: '50%',
                          opacity: 0.2,
                          animation: 'pulse 2s ease-in-out infinite'
                        }} />
                      </div>
                    </div>
                    
                    <h1 
                      className="h3 fw-bold mb-3 gradient-text"
                      style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}
                    >
                      ברוכים הבאים למצב דמו 🎭
                    </h1>
                    
                    <p className="text-muted mb-4" style={{ fontSize: '15px' }}>
                      מתחבר למערכת עם משתמש דמו...
                    </p>

                    {/* Progress indicator with percentage */}
                    <div className="mb-4">
                      <div style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#667eea'
                      }}>
                        {Math.round(progress)}% מושלם
                      </div>
                    </div>
                    
                    <div className="mt-4 p-4 slide-in" style={{
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                      borderRadius: '16px',
                      fontSize: '14px',
                      color: '#6c757d',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                    }}>
                      <div className="mb-3" style={{ fontSize: '16px' }}>
                        <strong style={{ color: '#667eea' }}>💡 מה זה מצב דמו?</strong>
                      </div>
                      <div className="text-start" style={{ lineHeight: '1.8' }}>
                        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#10b981', fontSize: '18px' }}>✓</span>
                          <span>נתונים מדומים - לא משפיעים על הזמנות אמיתיות</span>
                        </div>
                        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#10b981', fontSize: '18px' }}>✓</span>
                          <span>ניתן לבדוק את כל התכונות בבטחה</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#10b981', fontSize: '18px' }}>✓</span>
                          <span>אידיאלי להדגמה ולמשוב</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success State */}
                {status === 'success' && (
                  <div className="scale-in">
                    <div className="mb-4">
                      <div 
                        style={{
                          width: '100px',
                          height: '100px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                          fontSize: '50px',
                          color: '#10b981',
                          boxShadow: '0 10px 40px rgba(16, 185, 129, 0.3)',
                          position: 'relative'
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          border: '3px solid #10b981',
                          opacity: 0.3,
                          animation: 'pulse 1.5s ease-in-out infinite'
                        }} />
                        ✓
                      </div>
                    </div>
                    
                    <h1 
                      className="h3 fw-bold mb-3"
                      style={{
                        color: '#10b981',
                        fontSize: 'clamp(1.5rem, 5vw, 2rem)'
                      }}
                    >
                      התחברות הצליחה! 🎉
                    </h1>
                    
                    <p className="mb-4" style={{ 
                      color: '#6b7280',
                      fontSize: '15px',
                      fontWeight: '500'
                    }}>
                      מעביר אותך לדשבורד...
                    </p>

                    <div style={{
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, #d1fae515 0%, #a7f3d015 100%)',
                      borderRadius: '12px',
                      display: 'inline-block',
                      fontSize: '14px',
                      color: '#10b981',
                      fontWeight: '600'
                    }}>
                      🚀 טוען את המערכת...
                    </div>
                  </div>
                )}

                {/* Error State */}
                {status === 'error' && (
                  <div className="scale-in">
                    <div className="mb-4">
                      <div 
                        style={{
                          width: '100px',
                          height: '100px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                          fontSize: '50px',
                          color: '#dc2626',
                          boxShadow: '0 10px 40px rgba(220, 38, 38, 0.2)',
                          position: 'relative'
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          border: '3px solid #dc2626',
                          opacity: 0.3,
                          animation: 'pulse 1.5s ease-in-out infinite'
                        }} />
                        ✕
                      </div>
                    </div>
                    
                    <h1 
                      className="h3 fw-bold mb-3"
                      style={{
                        color: '#dc2626',
                        fontSize: 'clamp(1.5rem, 5vw, 2rem)'
                      }}
                    >
                      שגיאה בהתחברות
                    </h1>
                    
                    {error && (
                      <div 
                        className="mb-4" 
                        role="alert"
                        style={{
                          borderRadius: '12px',
                          fontSize: '14px',
                          padding: '16px',
                          background: 'linear-gradient(135deg, #fee2e215 0%, #fecaca15 100%)',
                          border: '1px solid #fecaca',
                          color: '#991b1b',
                          lineHeight: '1.6'
                        }}
                      >
                        {error}
                      </div>
                    )}
                    
                    <button 
                      onClick={() => window.location.reload()}
                      className="btn w-100 hover-lift"
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        color: 'white',
                        padding: '14px',
                        fontSize: '16px',
                        fontWeight: '600',
                        borderRadius: '12px',
                        marginBottom: '12px',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      🔄 נסה שוב
                    </button>
                    
                    <a 
                      href="/dashboard/login"
                      className="btn w-100 hover-lift"
                      style={{
                        background: 'white',
                        border: '2px solid #e5e7eb',
                        color: '#6b7280',
                        padding: '14px',
                        fontSize: '16px',
                        fontWeight: '600',
                        borderRadius: '12px',
                        textDecoration: 'none',
                        display: 'block',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      ← חזרה להתחברות רגילה
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Info Box at Bottom with Copy Button */}
            {status === 'connecting' && (
              <div 
                className="text-center mt-4 fade-in-up"
                style={{
                  animationDelay: '0.3s'
                }}
              >
                <div 
                  style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    padding: '20px',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}
                >
                  <div className="mb-3" style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#667eea'
                  }}>
                    📤 שתף קישור זה עם אחרים
                  </div>
                  
                  <div style={{ position: 'relative' }}>
                    <div 
                      style={{
                        backgroundColor: '#f8f9fa',
                        padding: '14px 120px 14px 16px',
                        borderRadius: '12px',
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        wordBreak: 'break-all',
                        color: '#374151',
                        border: '2px solid #e5e7eb',
                        textAlign: 'left',
                        direction: 'ltr'
                      }}
                    >
                      {demoUrl}
                    </div>
                    
                    <button
                      onClick={copyDemoLink}
                      style={{
                        position: 'absolute',
                        left: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: copied 
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        color: 'white',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: '600',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: copied
                          ? '0 4px 12px rgba(16, 185, 129, 0.3)'
                          : '0 4px 12px rgba(102, 126, 234, 0.3)',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        if (!copied) {
                          e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(-50%) scale(1)'
                      }}
                    >
                      {copied ? '✓ הועתק!' : '📋 העתק'}
                    </button>
                  </div>

                  <div className="mt-3" style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    lineHeight: '1.6'
                  }}>
                    כל מי שיקבל את הקישור יוכל להיכנס למצב דמו בקלות
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </main>
    </>
  )
}

export default DemoAutoLoginPage
