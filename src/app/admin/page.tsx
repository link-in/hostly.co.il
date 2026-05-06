'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardHeader from '@/components/DashboardHeader'

export default function AdminDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Redirect if not admin
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/')
      return
    }
    if (session?.user?.role !== 'admin') {
      router.push('/dashboard')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  if (session?.user?.role !== 'admin') {
    return null
  }

  return (
    <div className="container py-4" style={{ maxWidth: '1200px', direction: 'rtl' }}>
      <DashboardHeader 
        session={session}
        title="לוח בקרה אדמין"
        subtitle="ניהול המערכת"
        currentPage="admin"
        showLandingPageButton={false}
      />
      
      <div 
        className="d-flex flex-column align-items-center mb-4 p-4 mt-4"
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        <h1 
          className="mb-2"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 'bold',
          }}
        >
          🏔️ HOSTLY - לוח בקרה אדמין
        </h1>
        <p className="text-muted mb-0">
          שלום {session.user.displayName}, ברוך הבא למערכת הניהול!
        </p>
      </div>

      <div className="row g-4">
        {/* Users Management Card */}
        <div className="col-md-6">
          <Link href="/admin/users" className="text-decoration-none">
            <div 
              className="card h-100 border-0 shadow-sm hover-shadow" 
              style={{ 
                cursor: 'pointer', 
                transition: 'all 0.3s',
                borderRadius: '12px',
                background: 'white'
              }}
            >
              <div className="card-body text-center p-4">
                <div 
                  className="display-1 mb-3"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  👥
                </div>
                <h3 className="card-title">ניהול משתמשים</h3>
                <p className="card-text text-muted">
                  הוסף, ערוך ומחק משתמשים במערכת
                </p>
                <button 
                  className="btn mt-3"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    color: 'white',
                  }}
                >
                  עבור לניהול משתמשים →
                </button>
              </div>
            </div>
          </Link>
        </div>

        {/* Subscriptions Card */}
        <div className="col-md-6">
          <Link href="/admin/subscriptions" className="text-decoration-none">
            <div 
              className="card h-100 border-0 shadow-sm hover-shadow" 
              style={{ 
                cursor: 'pointer', 
                transition: 'all 0.3s',
                borderRadius: '12px',
                background: 'white'
              }}
            >
              <div className="card-body text-center p-4">
                <div 
                  className="display-1 mb-3"
                  style={{
                    background: 'linear-gradient(135deg, #764ba2 0%, #f093fb 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  💰
                </div>
                <h3 className="card-title">ניהול מנויים</h3>
                <p className="card-text text-muted">
                  צפייה ב מנויים, תשלומים ושימוש
                </p>
                <button 
                  className="btn mt-3"
                  style={{
                    background: 'linear-gradient(135deg, #764ba2 0%, #f093fb 100%)',
                    border: 'none',
                    color: 'white',
                  }}
                >
                  עבור למנויים →
                </button>
              </div>
            </div>
          </Link>
        </div>

        {/* System Settings Card */}
        <div className="col-md-6">
          <Link 
            href="/admin/settings"
            className="text-decoration-none"
          >
            <div 
              className="card h-100 border-0 shadow-sm" 
              style={{ 
                borderRadius: '12px',
                background: 'white',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)'
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div className="card-body text-center p-4">
                <div 
                  className="display-1 mb-3"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #f093fb 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  ⚙️
                </div>
                <h3 className="card-title">הגדרות מערכת</h3>
                <p className="card-text text-muted">
                  ניהול עמלות ופלטפורמות
                </p>
                <span 
                  className="btn mt-3"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                  }}
                >
                  כניסה להגדרות
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Analytics Card */}
        <div className="col-md-6">
          <div 
            className="card h-100 border-0 shadow-sm" 
            style={{ 
              opacity: 0.7,
              borderRadius: '12px',
              background: 'white'
            }}
          >
            <div className="card-body text-center p-4">
              <div 
                className="display-1 mb-3"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #f093fb 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                📊
              </div>
              <h3 className="card-title">סטטיסטיקות</h3>
              <p className="card-text text-muted">
                צפייה בנתונים ודוחות
              </p>
              <button 
                className="btn mt-3"
                style={{
                  border: '1px solid #cbd5e1',
                  color: '#64748b',
                  backgroundColor: 'transparent',
                }}
                disabled
              >
                בקרוב...
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Back to Dashboard */}
      <div className="row mt-5">
        <div className="col-12 text-center">
          <Link 
            href="/dashboard" 
            className="btn"
            style={{
              border: '1px solid white',
              color: 'white',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }}
          >
            ← חזור לדשבורד רגיל
          </Link>
        </div>
      </div>

      <style jsx>{`
        .hover-shadow:hover {
          transform: translateY(-5px);
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
        }
      `}</style>
    </div>
  )
}
