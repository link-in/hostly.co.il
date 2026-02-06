'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, Send, Download, CheckCircle, Clock, XCircle, ExternalLink } from 'lucide-react'
import type { CheckIn } from '@/lib/check-in/types'
import { SessionProvider } from '../SessionProvider'
import DashboardHeader from '@/components/DashboardHeader'

function CheckInsPageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'expired'>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/dashboard/login')
    }
  }, [status, router])

  useEffect(() => {
    async function fetchCheckIns() {
      try {
        const res = await fetch('/api/dashboard/check-ins')
        if (res.ok) {
          const data = await res.json()
          setCheckIns(data)
        }
      } catch (error) {
        console.error('Error fetching check-ins:', error)
      } finally {
        setLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchCheckIns()
    }
  }, [status])

  const filteredCheckIns = checkIns.filter(checkIn => {
    if (filter === 'all') return true
    return checkIn.status === filter
  })

  const stats = {
    pending: checkIns.filter(c => c.status === 'pending').length,
    completed: checkIns.filter(c => c.status === 'completed').length,
    total: checkIns.length,
    completionRate: checkIns.length > 0 
      ? Math.round((checkIns.filter(c => c.status === 'completed').length / checkIns.length) * 100)
      : 0,
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="badge bg-success"><CheckCircle size={14} /> הושלם</span>
      case 'pending':
        return <span className="badge bg-warning text-dark"><Clock size={14} /> ממתין</span>
      case 'expired':
        return <span className="badge bg-danger"><XCircle size={14} /> פג תוקף</span>
      default:
        return <span className="badge bg-secondary">{status}</span>
    }
  }

  const resendLink = async (checkIn: CheckIn) => {
    if (confirm(`לשלוח שוב קישור צ'ק-אין ל-${checkIn.guest_name}?`)) {
      // TODO: Implement resend functionality
      alert('הקישור נשלח בהצלחה!')
    }
  }

  if (loading) {
    return (
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
    )
  }

  return (
    <main 
      style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      }} 
      dir="rtl"
    >
      <div className="container py-3 py-md-5">
        <div className="row justify-content-center">
          <div className="col-lg-11 col-xl-10">
            <div className="mb-3 mb-md-4">
              <DashboardHeader 
                session={session}
                title="ניהול צ'ק-אין דיגיטלי"
                showLandingPageButton={true}
                currentPage="check-ins"
              />
            </div>
          </div>
        </div>

        <div className="row justify-content-center">
          <div className="col-lg-11 col-xl-10">
            <div 
              className="card border-0 shadow-lg"
              style={{ borderRadius: '16px' }}
            >
              <div className="card-body p-3 p-md-4" style={{ direction: 'rtl' }}>

                {/* Stats Cards */}
                <div className="row g-2 g-md-3 mb-4">
                  <div className="col-3">
                    <div className="card text-center border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                      <div className="card-body p-2 p-md-3">
                        <h3 className="mb-1" style={{ color: '#f59e0b', fontSize: 'clamp(1rem, 4vw, 2rem)' }}>{stats.pending}</h3>
                        <p className="mb-0 text-muted" style={{ fontSize: 'clamp(0.65rem, 2.5vw, 0.9rem)' }}>ממתינים</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="card text-center border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                      <div className="card-body p-2 p-md-3">
                        <h3 className="mb-1" style={{ color: '#10b981', fontSize: 'clamp(1rem, 4vw, 2rem)' }}>{stats.completed}</h3>
                        <p className="mb-0 text-muted" style={{ fontSize: 'clamp(0.65rem, 2.5vw, 0.9rem)' }}>הושלמו</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="card text-center border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                      <div className="card-body p-2 p-md-3">
                        <h3 className="mb-1" style={{ 
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          fontSize: 'clamp(1rem, 4vw, 2rem)'
                        }}>{stats.total}</h3>
                        <p className="mb-0 text-muted" style={{ fontSize: 'clamp(0.65rem, 2.5vw, 0.9rem)' }}>סה"כ</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="card text-center border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                      <div className="card-body p-2 p-md-3">
                        <h3 className="mb-1" style={{ color: '#06b6d4', fontSize: 'clamp(1rem, 4vw, 2rem)' }}>{stats.completionRate}%</h3>
                        <p className="mb-0 text-muted" style={{ fontSize: 'clamp(0.65rem, 2.5vw, 0.9rem)' }}>אחוז</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filters */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div 
                    style={{ 
                      display: 'flex',
                      gap: '0',
                      flexWrap: 'wrap',
                    }}
                    role="group"
                  >
                    <button
                      type="button"
                      className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setFilter('all')}
                      style={{
                        ...(filter === 'all' ? {
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          border: 'none',
                          color: 'white'
                        } : {}),
                        borderTopRightRadius: '8px',
                        borderBottomRightRadius: '8px',
                        borderTopLeftRadius: '0',
                        borderBottomLeftRadius: '0',
                      }}
                    >
                      הכל ({checkIns.length})
                    </button>
                    <button
                      type="button"
                      className={`btn ${filter === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
                      onClick={() => setFilter('pending')}
                      style={{
                        borderRadius: '0',
                      }}
                    >
                      ממתינים ({stats.pending})
                    </button>
                    <button
                      type="button"
                      className={`btn ${filter === 'completed' ? 'btn-success' : 'btn-outline-success'}`}
                      onClick={() => setFilter('completed')}
                      style={{
                        borderRadius: '0',
                      }}
                    >
                      הושלמו ({stats.completed})
                    </button>
                    <button
                      type="button"
                      className={`btn ${filter === 'expired' ? 'btn-danger' : 'btn-outline-danger'}`}
                      onClick={() => setFilter('expired')}
                      style={{
                        borderTopLeftRadius: '8px',
                        borderBottomLeftRadius: '8px',
                        borderTopRightRadius: '0',
                        borderBottomRightRadius: '0',
                      }}
                    >
                      פג תוקף
                    </button>
                  </div>
                </div>

                {/* Table */}
                {filteredCheckIns.length === 0 ? (
                  <div className="card border-0 shadow-sm">
                    <div className="card-body text-center py-5">
                      <p className="text-muted mb-0">אין צ'ק-אינים להצגה</p>
                    </div>
                  </div>
                ) : (
                  <div className="card border-0 shadow-sm">
                    <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>אורח</th>
                  <th>תאריך כניסה</th>
                  <th>סטטוס</th>
                  <th>תאריך השלמה</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredCheckIns.map((checkIn) => (
                  <tr key={checkIn.id}>
                    <td>
                      <div>
                        <strong>{checkIn.guest_name}</strong>
                        <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                          {checkIn.guest_phone}
                        </div>
                      </div>
                    </td>
                    <td>
                      {new Date(checkIn.check_in_date).toLocaleDateString('he-IL')}
                    </td>
                    <td>{getStatusBadge(checkIn.status)}</td>
                    <td>
                      {checkIn.completed_at 
                        ? new Date(checkIn.completed_at).toLocaleDateString('he-IL')
                        : '-'
                      }
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {/* כפתור פתיחת קישור צ'ק-אין */}
                        {checkIn.status === 'pending' && checkIn.token && (
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => window.open(`${window.location.origin}/check-in/${checkIn.token}`, '_blank')}
                            title="פתח קישור צ'ק-אין"
                          >
                            <ExternalLink size={16} />
                          </button>
                        )}
                        
                        {/* כפתור צפייה בפרטים */}
                        <button
                          className="btn btn-sm"
                          style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none'
                          }}
                          onClick={() => router.push(`/dashboard/check-ins/${checkIn.id}`)}
                          title="צפה בפרטים"
                        >
                          <Eye size={16} />
                        </button>
                        
                        {/* כפתור שליחה מחדש */}
                        {checkIn.status === 'pending' && (
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => resendLink(checkIn)}
                            title="שלח שוב"
                          >
                            <Send size={16} />
                          </button>
                        )}
                        
                        {/* כפתור הורדת PDF */}
                        {checkIn.status === 'completed' && (
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => {/* TODO: Download PDF */}}
                            title="הורד PDF"
                          >
                            <Download size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
  )
}

export default function CheckInsPage() {
  return (
    <SessionProvider>
      <CheckInsPageContent />
    </SessionProvider>
  )
}
