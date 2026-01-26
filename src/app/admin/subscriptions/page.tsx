'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Subscription {
  id: string
  userId: string
  planId: string
  status: string
  billingCycle: string
  startedAt: string
  expiresAt: string
  autoRenew: boolean
  user: {
    displayName: string
    email: string
  }
  plan: {
    displayName: string
    monthlyPrice: number
  }
  usage: {
    whatsappSent: number
    whatsappLimit: number
  }
}

export default function AdminSubscriptionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeSubscriptions: 0,
    trialSubscriptions: 0,
    expiredSubscriptions: 0,
  })

  // Redirect if not admin
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/dashboard/login')
      return
    }
    if (session?.user?.role !== 'admin') {
      router.push('/dashboard')
      return
    }
  }, [session, status, router])

  // Fetch subscriptions
  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchSubscriptions()
    }
  }, [session])

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/subscriptions')
      if (!response.ok) throw new Error('Failed to fetch subscriptions')
      const data = await response.json()
      setSubscriptions(data.subscriptions)
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; gradient: string }> = {
      active: { text: 'פעיל', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
      trial: { text: 'ניסיון', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
      expired: { text: 'פג תוקף', gradient: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' },
      cancelled: { text: 'בוטל', gradient: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)' },
      suspended: { text: 'מושעה', gradient: 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)' },
    }
    const badge = badges[status] || { text: status, gradient: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)' }
    return <span className="badge" style={{ background: badge.gradient, color: 'white' }}>{badge.text}</span>
  }

  if (status === 'loading' || loading) {
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
    <div className="container py-5" style={{ maxWidth: '1400px', direction: 'rtl' }}>
      {/* Header with Logo */}
      <div 
        className="d-flex flex-column flex-md-row align-items-center justify-content-between mb-4 p-4"
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div className="d-flex align-items-center gap-3 mb-3 mb-md-0">
          <img
            src="/photos/hostly-logo.png"
            alt="Hostly"
            style={{ height: '48px', objectFit: 'contain' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <h3 
            className="mb-0"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 'bold',
            }}
          >
            💰 ניהול מנויים
          </h3>
        </div>
        <button 
          className="btn"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            color: 'white',
          }}
          onClick={fetchSubscriptions}
        >
          🔄 רענן
        </button>
      </div>

      {/* Stats Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm" style={{ borderRadius: '12px', background: 'white' }}>
            <div className="card-body text-center">
              <div 
                className="display-6 mb-2"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontWeight: 'bold',
                }}
              >
                ₪{stats.totalRevenue.toLocaleString()}
              </div>
              <div className="text-muted">הכנסות חודשיות</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm" style={{ borderRadius: '12px', background: 'white' }}>
            <div className="card-body text-center">
              <div 
                className="display-6 mb-2"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontWeight: 'bold',
                }}
              >
                {stats.activeSubscriptions}
              </div>
              <div className="text-muted">מנויים פעילים</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm" style={{ borderRadius: '12px', background: 'white' }}>
            <div className="card-body text-center">
              <div 
                className="display-6 mb-2"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #f093fb 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontWeight: 'bold',
                }}
              >
                {stats.trialSubscriptions}
              </div>
              <div className="text-muted">תקופות ניסיון</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm" style={{ borderRadius: '12px', background: 'white' }}>
            <div className="card-body text-center">
              <div 
                className="display-6 mb-2"
                style={{
                  background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontWeight: 'bold',
                }}
              >
                {stats.expiredSubscriptions}
              </div>
              <div className="text-muted">פגי תוקף</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
        <div 
          className="card-body"
          style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(249, 147, 251, 0.05) 100%)',
          }}
        >
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              {error}
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setError(null)}
              ></button>
            </div>
          )}

          <div className="table-responsive bg-white rounded-3">
            <table className="table table-hover mb-0">
              <thead>
                <tr 
                  style={{
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(249, 147, 251, 0.1) 100%)',
                  }}
                >
                  <th style={{ fontWeight: 'bold', color: '#667eea' }}>משתמש</th>
                  <th style={{ fontWeight: 'bold', color: '#667eea' }}>תוכנית</th>
                  <th style={{ fontWeight: 'bold', color: '#667eea' }}>סטטוס</th>
                  <th style={{ fontWeight: 'bold', color: '#667eea' }}>מחזור</th>
                  <th style={{ fontWeight: 'bold', color: '#667eea' }}>מחיר</th>
                  <th style={{ fontWeight: 'bold', color: '#667eea' }}>שימוש WhatsApp</th>
                  <th style={{ fontWeight: 'bold', color: '#667eea' }}>תוקף עד</th>
                  <th style={{ fontWeight: 'bold', color: '#667eea' }}>חידוש אוטומטי</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <div className="fw-bold">{sub.user.displayName}</div>
                      <small className="text-muted">{sub.user.email}</small>
                    </td>
                    <td>
                      <span 
                        className="badge"
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                        }}
                      >
                        {sub.plan.displayName}
                      </span>
                    </td>
                    <td>{getStatusBadge(sub.status)}</td>
                    <td>
                      {sub.billingCycle === 'monthly' ? 'חודשי' : 'שנתי'}
                    </td>
                    <td className="fw-bold">₪{sub.plan.monthlyPrice}</td>
                    <td>
                      <div className="progress" style={{ height: '20px' }}>
                        <div
                          className={`progress-bar ${
                            sub.usage.whatsappSent / sub.usage.whatsappLimit > 0.9
                              ? 'bg-danger'
                              : sub.usage.whatsappSent / sub.usage.whatsappLimit > 0.7
                              ? 'bg-warning'
                              : 'bg-success'
                          }`}
                          style={{
                            width: `${(sub.usage.whatsappSent / sub.usage.whatsappLimit) * 100}%`,
                          }}
                        >
                          {sub.usage.whatsappSent}/{sub.usage.whatsappLimit}
                        </div>
                      </div>
                    </td>
                    <td>
                      <small>
                        {new Date(sub.expiresAt).toLocaleDateString('he-IL')}
                      </small>
                    </td>
                    <td>
                      {sub.autoRenew ? (
                        <span className="text-success">✓</span>
                      ) : (
                        <span className="text-danger">✗</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {subscriptions.length === 0 && !loading && (
            <div className="text-center text-muted py-4">
              אין מנויים במערכת
            </div>
          )}
        </div>
      </div>

      {/* Back to Admin Dashboard */}
      <div className="row mt-4">
        <div className="col-12 text-center">
          <a 
            href="/admin" 
            className="btn"
            style={{
              border: '1px solid white',
              color: 'white',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }}
          >
            ← חזור ללוח בקרה אדמין
          </a>
        </div>
      </div>
    </div>
  )
}
