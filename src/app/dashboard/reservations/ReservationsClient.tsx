'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { Reservation } from '@/lib/dashboard/types'
import { formatCurrency } from '@/lib/dashboard/utils'
import { getDashboardProvider } from '@/lib/dashboard/getDashboardProvider'

// LocalStorage key for viewed reservations
const VIEWED_RESERVATIONS_KEY = 'hostly_viewed_reservations'

// Get list of viewed reservation IDs
const getViewedReservations = (): Set<string> => {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem(VIEWED_RESERVATIONS_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

// Mark reservation as viewed
const markReservationAsViewed = (reservationId: string) => {
  if (typeof window === 'undefined') return
  try {
    const viewed = getViewedReservations()
    viewed.add(reservationId)
    localStorage.setItem(VIEWED_RESERVATIONS_KEY, JSON.stringify([...viewed]))
  } catch (error) {
    console.error('Failed to mark reservation as viewed:', error)
  }
}

// Mark reservations created in the last 3 days as "new" (unless already viewed)
const markNewReservations = (reservations: Reservation[]): Reservation[] => {
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  const viewedIds = getViewedReservations()
  
  return reservations.map(reservation => {
    // Skip if already viewed
    if (viewedIds.has(reservation.id)) {
      return reservation
    }
    
    if (reservation.isNew) {
      // Already marked (e.g., demo reservations)
      return reservation
    }
    
    if (reservation.createdAt) {
      const createdDate = new Date(reservation.createdAt)
      if (!Number.isNaN(createdDate.getTime()) && createdDate >= threeDaysAgo) {
        return { ...reservation, isNew: true }
      }
    }
    
    return reservation
  })
}

export default function ReservationsClient() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<'checkIn' | 'total' | 'status'>('checkIn')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [commissionRates, setCommissionRates] = useState<Record<string, number>>({
    booking: 0.15,
    airbnb: 0.16,
    direct: 0,
  })
  const [logoSrc, setLogoSrc] = useState('/photos/hostly-logo.png')
  const [logoVisible, setLogoVisible] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [viewedReservations, setViewedReservations] = useState<Set<string>>(new Set())

  const { provider, meta } = useMemo(() => getDashboardProvider(session?.user), [session?.user])
  
  const handleReservationViewed = (reservationId: string) => {
    markReservationAsViewed(reservationId)
    setViewedReservations(prev => new Set([...prev, reservationId]))
  }
  
  const isReservationViewed = (id: string) => viewedReservations.has(id)

  // Authentication guard
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/dashboard/login')
    }
  }, [status, router])

  // Load data
  useEffect(() => {
    let isActive = true

    const load = async () => {
      try {
        const [reservationsData, commissionRatesData] = await Promise.all([
          provider.getReservations(),
          fetch('/api/commission-rates').then(res => res.json())
        ])

        if (isActive) {
          // Mark new reservations (created in last 7 days)
          setReservations(markNewReservations(reservationsData))
          if (commissionRatesData.rates) {
            setCommissionRates(commissionRatesData.rates)
          }
          setLoading(false)
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'טעינת נתונים נכשלה')
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      isActive = false
    }
  }, [provider])

  // Logo error handling
  const handleLogoError = () => {
    if (logoSrc === '/photos/hostly-logo.png') {
      setLogoSrc('/hostly-logo.png')
    } else {
      setLogoVisible(false)
    }
  }

  // Filtered and sorted reservations
  const filteredReservations = useMemo(() => {
    let filtered = [...reservations]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.guestName?.toLowerCase().includes(query) ||
          r.id?.toLowerCase().includes(query) ||
          r.email?.toLowerCase().includes(query) ||
          r.phone?.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter)
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter((r) => r.source?.toLowerCase().includes(sourceFilter.toLowerCase()))
    }

    // Sort
    filtered.sort((a, b) => {
      let valA: any, valB: any

      if (sortField === 'checkIn') {
        valA = new Date(a.checkIn || 0).getTime()
        valB = new Date(b.checkIn || 0).getTime()
      } else if (sortField === 'total') {
        valA = a.total || 0
        valB = b.total || 0
      } else if (sortField === 'status') {
        valA = a.status || ''
        valB = b.status || ''
      }

      if (sortDirection === 'asc') {
        return valA > valB ? 1 : -1
      } else {
        return valA < valB ? 1 : -1
      }
    })

    return filtered
  }, [reservations, searchQuery, statusFilter, sourceFilter, sortField, sortDirection])

  // Advanced statistics
  const stats = useMemo(() => {
    let totalRevenue = 0
    let totalCommission = 0
    let totalNights = 0
    const statusCounts: Record<string, number> = {}
    const sourceCounts: Record<string, number> = {}
    const monthlyRevenue: Record<string, number> = {}

    reservations.forEach((reservation) => {
      totalRevenue += reservation.total

      // Commission calculation
      const source = reservation.source?.toLowerCase() || ''
      let commissionRate = 0

      if (source.includes('booking') && commissionRates.booking) {
        commissionRate = commissionRates.booking
      } else if (source.includes('airbnb') && commissionRates.airbnb) {
        commissionRate = commissionRates.airbnb
      } else if (source.includes('direct') && commissionRates.direct) {
        commissionRate = commissionRates.direct
      }

      totalCommission += reservation.total * commissionRate

      // Nights calculation
      if (reservation.checkIn && reservation.checkOut) {
        const checkIn = new Date(reservation.checkIn)
        const checkOut = new Date(reservation.checkOut)
        const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
        if (nights > 0) totalNights += nights
      }

      // Status counts
      const status = reservation.status || 'unknown'
      statusCounts[status] = (statusCounts[status] || 0) + 1

      // Source counts
      const sourceKey = reservation.source || 'Unknown'
      sourceCounts[sourceKey] = (sourceCounts[sourceKey] || 0) + 1

      // Monthly revenue
      if (reservation.checkIn) {
        const month = new Intl.DateTimeFormat('he-IL', { year: 'numeric', month: 'long' }).format(new Date(reservation.checkIn))
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + reservation.total
      }
    })

    const netRevenue = totalRevenue - totalCommission
    const avgNightlyRate = totalNights > 0 ? totalRevenue / totalNights : 0
    const avgBookingValue = reservations.length > 0 ? totalRevenue / reservations.length : 0

    return {
      totalRevenue,
      totalCommission,
      netRevenue,
      totalNights,
      avgNightlyRate,
      avgBookingValue,
      totalReservations: reservations.length,
      statusCounts,
      sourceCounts,
      monthlyRevenue,
    }
  }, [reservations, commissionRates])

  // Custom styles for hover effects
  const styles = `
    .profile-btn-gradient:hover {
      opacity: 0.9 !important;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    .sort-btn:hover {
      background: rgba(102, 126, 234, 0.1) !important;
    }
  `

  if (status === 'loading' || loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">טוען...</span>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.href = '/dashboard/login'
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)' }}>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      
      {/* Header */}
      <div className="container py-5">
        <div
          className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between mb-4 gap-3"
          style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
              <div className="d-flex align-items-center gap-3">
                {logoVisible ? (
                  <img
                    src={logoSrc}
                    alt="Hostly"
                    style={{ height: '48px', objectFit: 'contain' }}
                    onError={handleLogoError}
                  />
                ) : null}
                <div>
                  <h1
                    className="fw-bold mb-1"
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      fontSize: '1.5rem',
                    }}
                  >
                    {session?.user?.displayName ?? 'Hostly'}
                  </h1>
                  {session?.user?.firstName && session?.user?.lastName ? (
                    <p className="small mb-0" style={{ color: '#667eea', fontWeight: '500' }}>
                      שלום {session.user.firstName} {session.user.lastName}
                    </p>
                  ) : null}
                  <p className="small mb-0 text-muted">כל ההזמנות</p>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2 position-relative justify-content-center justify-content-lg-start">
                <Link href="/dashboard">
                  <button
                    type="button"
                    className="btn btn-sm d-flex align-items-center justify-content-center"
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '1px solid #667eea',
                      color: '#667eea',
                      backgroundColor: 'transparent',
                      padding: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#667eea'
                      e.currentTarget.style.color = 'white'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = '#667eea'
                    }}
                    title="דף הבית"
                    aria-label="דף הבית"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </button>
                </Link>
                {session?.user?.landingPageUrl ? (
                  <button
                    type="button"
                    className="btn btn-sm d-flex align-items-center justify-content-center"
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '1px solid #f093fb',
                      color: '#f093fb',
                      backgroundColor: 'transparent',
                      padding: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f093fb'
                      e.currentTarget.style.color = 'white'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = '#f093fb'
                    }}
                    onClick={() => window.open(session.user.landingPageUrl, '_blank')}
                    title="צפייה באתר"
                    aria-label="צפייה באתר"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn-sm d-flex align-items-center justify-content-center"
                  style={{
                    width: '36px',
                    height: '36px',
                    border: '1px solid #dc3545',
                    color: '#dc3545',
                    backgroundColor: 'transparent',
                    padding: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#dc3545'
                    e.currentTarget.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = '#dc3545'
                  }}
                  onClick={handleLogout}
                  title="התנתק"
                  aria-label="התנתק"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="btn btn-sm d-flex align-items-center justify-content-center"
                  style={{
                    width: '36px',
                    height: '36px',
                    border: '1px solid #667eea',
                    color: '#667eea',
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#667eea'
                    e.currentTarget.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = '#667eea'
                  }}
                  aria-label="תפריט"
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  <span style={{ display: 'inline-block', lineHeight: 1 }}>☰</span>
                </button>
                {menuOpen ? (
                  <div
                    className="position-absolute bg-white border rounded-3 shadow-sm p-2"
                    style={{ top: '46px', right: 0, minWidth: '200px', zIndex: 10 }}
                  >
                    <Link className="dropdown-item py-2" href="/dashboard" onClick={() => setMenuOpen(false)}>
                      ניהול זמינות/מחירים
                    </Link>
                    <Link className="dropdown-item py-2" href="/dashboard/reservations" onClick={() => setMenuOpen(false)}>
                      כל ההזמנות
                    </Link>
                    <Link className="dropdown-item py-2" href="/dashboard/profile" onClick={() => setMenuOpen(false)}>
                      איזור אישי
                    </Link>
                    <Link className="dropdown-item py-2" href="/dashboard/landing" onClick={() => setMenuOpen(false)}>
                      ניהול דף נחיתה
                    </Link>
                    <Link className="dropdown-item py-2" href="/dashboard/payments" onClick={() => setMenuOpen(false)}>
                      סליקת אשראי
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
      </div>

      {/* Main Content */}
      <div className="container pb-5">
            {/* Demo Mode Banner */}
            {meta.isMock && session?.user?.isDemo && (
              <div
                className="alert alert-info mb-4 d-flex align-items-center gap-3"
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '2px solid #667eea',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ fontSize: '2rem' }}>🎭</div>
                <div>
                  <strong style={{ color: '#667eea' }}>מצב דמו</strong>
                  <div className="small text-muted">
                    אתה רואה נתונים מדומים. 40 הזמנות ריאליסטיות למשך שנת 2026.
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="alert alert-danger mb-4" role="alert">
                {error}
              </div>
            )}

            {/* Statistics Cards */}
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                  <div className="card-body text-center">
                    <div className="small text-muted mb-1">סה"כ הזמנות</div>
                    <div
                      className="h3 fw-bold mb-0"
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {stats.totalReservations}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                  <div className="card-body text-center">
                    <div className="small text-muted mb-1">סה"כ לילות</div>
                    <div
                      className="h3 fw-bold mb-0"
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {stats.totalNights}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                  <div className="card-body text-center">
                    <div className="small text-muted mb-1">מחיר ממוצע ללילה</div>
                    <div
                      className="h4 fw-bold mb-0"
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {formatCurrency(stats.avgNightlyRate)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                  <div className="card-body text-center">
                    <div className="small text-muted mb-1">ממוצע להזמנה</div>
                    <div
                      className="h4 fw-bold mb-0"
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {formatCurrency(stats.avgBookingValue)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Cards */}
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                  <div className="card-body">
                    <div className="small text-muted mb-2">💰 הכנסות ברוטו</div>
                    <div className="h3 fw-bold text-success mb-0">
                      {formatCurrency(stats.totalRevenue)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                  <div className="card-body">
                    <div className="small text-muted mb-2">💸 סה"כ עמלות</div>
                    <div className="h3 fw-bold text-danger mb-0">
                      {formatCurrency(stats.totalCommission)}
                    </div>
                    <div className="small text-muted mt-1">
                      Booking {(commissionRates.booking * 100).toFixed(0)}% • Airbnb {(commissionRates.airbnb * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                  <div className="card-body">
                    <div className="small text-muted mb-2">✅ תשלום צפוי (נטו)</div>
                    <div
                      className="h3 fw-bold mb-0"
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {formatCurrency(stats.netRevenue)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
              <div
                className="card-body"
                style={{
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(249, 147, 251, 0.05) 100%)',
                }}
              >
                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">🔍 חיפוש</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="חיפוש לפי שם, מזהה הזמנה..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0',
                      }}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">📊 סטטוס</label>
                    <select
                      className="form-select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      style={{
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0',
                      }}
                    >
                      <option value="all">כל הסטטוסים</option>
                      <option value="confirmed">מאושר</option>
                      <option value="cancelled">מבוטל</option>
                      <option value="pending">ממתין</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">🌐 מקור</label>
                    <select
                      className="form-select"
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value)}
                      style={{
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0',
                      }}
                    >
                      <option value="all">כל המקורות</option>
                      <option value="booking">Booking.com</option>
                      <option value="airbnb">Airbnb</option>
                      <option value="direct">ישירה</option>
                    </select>
                  </div>
                  <div className="col-md-2 d-flex align-items-end">
                    <button
                      type="button"
                      className="btn btn-outline-secondary w-100"
                      onClick={() => {
                        setSearchQuery('')
                        setStatusFilter('all')
                        setSourceFilter('all')
                      }}
                      style={{ borderRadius: '8px' }}
                    >
                      🔄 אפס
                    </button>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center">
                  <div className="text-muted small">
                    מציג {filteredReservations.length} מתוך {reservations.length} הזמנות
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className={`btn btn-sm sort-btn ${sortField === 'checkIn' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => {
                        if (sortField === 'checkIn') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                        } else {
                          setSortField('checkIn')
                          setSortDirection('desc')
                        }
                      }}
                      style={{ borderRadius: '8px' }}
                    >
                      📅 תאריך {sortField === 'checkIn' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm sort-btn ${sortField === 'total' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => {
                        if (sortField === 'total') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                        } else {
                          setSortField('total')
                          setSortDirection('desc')
                        }
                      }}
                      style={{ borderRadius: '8px' }}
                    >
                      💰 סכום {sortField === 'total' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Reservations Table */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
              <div className="card-body p-0">
                <div 
                  className="table-responsive table-scroll-container"
                  style={{
                    maxHeight: '120vh',
                    overflowY: 'auto',
                    overflowX: 'auto',
                  }}
                >
                  <style dangerouslySetInnerHTML={{ __html: `
                    @media (max-width: 768px) {
                      .table-scroll-container {
                        max-height: 100vh !important;
                      }
                    }
                    .table-scroll-container::-webkit-scrollbar {
                      width: 8px;
                      height: 8px;
                    }
                    .table-scroll-container::-webkit-scrollbar-track {
                      background: #f1f1f1;
                      border-radius: 4px;
                    }
                    .table-scroll-container::-webkit-scrollbar-thumb {
                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      border-radius: 4px;
                    }
                    .table-scroll-container::-webkit-scrollbar-thumb:hover {
                      background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
                    }
                  `}} />
                  <table className="table table-hover mb-0">
                    <thead 
                      style={{ 
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(249, 147, 251, 0.1) 100%)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 5,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      }}
                    >
                      <tr>
                        <th className="p-3 fw-semibold">מזהה</th>
                        <th className="p-3 fw-semibold">שם אורח</th>
                        <th className="p-3 fw-semibold">כניסה</th>
                        <th className="p-3 fw-semibold">יציאה</th>
                        <th className="p-3 fw-semibold">לילות</th>
                        <th className="p-3 fw-semibold">סכום</th>
                        <th className="p-3 fw-semibold">מקור</th>
                        <th className="p-3 fw-semibold">סטטוס</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReservations.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-5 text-muted">
                            לא נמצאו הזמנות
                          </td>
                        </tr>
                      ) : (
                        filteredReservations.map((reservation) => {
                          const nights = reservation.checkIn && reservation.checkOut
                            ? Math.round(
                                (new Date(reservation.checkOut).getTime() - new Date(reservation.checkIn).getTime()) /
                                  (1000 * 60 * 60 * 24)
                              )
                            : 0

                          return (
                            <tr 
                              key={reservation.id}
                              onClick={() => {
                                if (reservation.isNew && !isReservationViewed(reservation.id)) {
                                  handleReservationViewed(reservation.id)
                                }
                              }}
                              style={{ cursor: reservation.isNew ? 'pointer' : 'default' }}
                            >
                              <td className="p-3">
                                <small className="text-muted">{reservation.id}</small>
                              </td>
                              <td className="p-3">
                                <div className="d-flex align-items-center gap-2">
                                  <span className="fw-semibold">{reservation.guestName || 'N/A'}</span>
                                  {reservation.isNew && !isReservationViewed(reservation.id) && (
                                    <span 
                                      className="badge" 
                                      style={{
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        color: 'white',
                                        fontSize: '0.7rem',
                                        padding: '2px 6px',
                                      }}
                                    >
                                      חדש ✨
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                {reservation.checkIn
                                  ? new Date(reservation.checkIn).toLocaleDateString('he-IL')
                                  : 'N/A'}
                              </td>
                              <td className="p-3">
                                {reservation.checkOut
                                  ? new Date(reservation.checkOut).toLocaleDateString('he-IL')
                                  : 'N/A'}
                              </td>
                              <td className="p-3">{nights > 0 ? `${nights} לילות` : '-'}</td>
                              <td className="p-3 fw-bold">{formatCurrency(reservation.total)}</td>
                              <td className="p-3">
                                <span
                                  className="badge"
                                  style={{
                                    background: reservation.source?.toLowerCase().includes('booking')
                                      ? '#003580'
                                      : reservation.source?.toLowerCase().includes('airbnb')
                                      ? '#FF5A5F'
                                      : '#6c757d',
                                    color: 'white',
                                  }}
                                >
                                  {reservation.source || 'Unknown'}
                                </span>
                              </td>
                              <td className="p-3">
                                <span
                                  className={`badge ${
                                    reservation.status === 'confirmed'
                                      ? 'bg-success'
                                      : reservation.status === 'cancelled'
                                      ? 'bg-danger'
                                      : 'bg-warning'
                                  }`}
                                >
                                  {reservation.status === 'confirmed'
                                    ? 'מאושר'
                                    : reservation.status === 'cancelled'
                                    ? 'מבוטל'
                                    : 'ממתין'}
                                </span>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

        {/* Back to Dashboard Button */}
        <div className="text-center mt-4">
          <Link href="/dashboard">
            <button
              type="button"
              className="btn btn-lg profile-btn-gradient"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 2rem',
                fontWeight: '500',
              }}
            >
              ← חזרה לדשבורד הראשי
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
