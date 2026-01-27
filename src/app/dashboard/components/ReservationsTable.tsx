'use client'

import React, { useState } from 'react'
import type { Reservation } from '@/lib/dashboard/types'
import { formatCurrency, formatDate, formatStatus } from '@/lib/dashboard/utils'

// Add styles for nearest reservation, table scrolling, and mobile list
const styles = `
  .nearest-reservation {
    background-color: #e3f2fd !important;
    border-left: 4px solid #764ba2 !important;
  }
  .nearest-reservation td {
    background-color: #e3f2fd !important;
    font-weight: 500 !important;
  }
  .dashboard-table-scroll-container {
    max-height: 60vh;
    overflow-y: auto;
    overflow-x: auto;
  }
  @media (max-width: 768px) {
    .dashboard-table-scroll-container {
      max-height: 50vh !important;
    }
  }
  .dashboard-table-scroll-container::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  .dashboard-table-scroll-container::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  .dashboard-table-scroll-container::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 4px;
  }
  .dashboard-table-scroll-container::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
  }
  .dashboard-table-scroll-container thead {
    position: sticky;
    top: 0;
    z-index: 5;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }
  
  /* Mobile stacked list styles - Dark gradient theme */
  .reservation-list-item {
    background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%);
    border-radius: 12px;
    margin-bottom: 12px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transition: all 0.2s;
    cursor: pointer;
  }
  .reservation-list-item:hover {
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    transform: translateY(-2px);
  }
  .reservation-list-item.expanded {
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.5);
  }
  .reservation-list-item.nearest {
    box-shadow: 0 6px 20px rgba(118, 75, 162, 0.4);
    background: linear-gradient(135deg, #2d1b3d 0%, #3d2952 50%, #4f3869 100%);
  }
  .reservation-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 18px;
    flex-shrink: 0;
    box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
  }
  .reservation-details-card {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    padding: 16px;
    margin-top: 16px;
    border: 1px solid rgba(249, 147, 251, 0.1);
  }
  .reservation-detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  .reservation-detail-row:last-child {
    border-bottom: none;
  }
  .reservation-detail-label {
    color: rgba(249, 147, 251, 0.8);
    font-size: 0.875rem;
    font-weight: 500;
  }
  .reservation-detail-value {
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.875rem;
    text-align: left;
  }
`

const getStatusClass = (status: Reservation['status']) => {
  switch (status) {
    case 'confirmed':
      return 'bg-success'
    case 'pending':
      return 'bg-warning text-dark'
    case 'cancelled':
      return 'bg-secondary'
    default:
      return 'bg-light text-dark'
  }
}

type ReservationsTableProps = {
  reservations: Reservation[]
  onReservationViewed?: (reservationId: string) => void
}

const ReservationsTable = ({ reservations, onReservationViewed }: ReservationsTableProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [mobileVisibleCount, setMobileVisibleCount] = useState(6)
  const [viewedReservations, setViewedReservations] = useState<Set<string>>(new Set())

  if (!reservations.length) {
    return <div className="text-muted">אין הזמנות להצגה כרגע.</div>
  }

  // Find the nearest upcoming reservation
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const upcomingReservations = reservations
    .filter(r => {
      const checkInDate = new Date(r.checkIn)
      checkInDate.setHours(0, 0, 0, 0)
      return checkInDate >= today && r.status !== 'cancelled'
    })
    .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())
  
  const nearestReservationId = upcomingReservations.length > 0 ? upcomingReservations[0].id : null

  const toggleExpanded = (id: string, isNew?: boolean) => {
    setExpandedId((prev) => (prev === id ? null : id))
    
    // Mark as viewed if it's a new reservation
    if (isNew && !viewedReservations.has(id)) {
      setViewedReservations(prev => new Set([...prev, id]))
      // Call parent callback if provided
      if (onReservationViewed) {
        onReservationViewed(id)
      }
    }
  }

  const isNearestReservation = (id: string) => id === nearestReservationId
  
  const isReservationViewed = (id: string) => viewedReservations.has(id)

  // Get initials from guest name
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Mobile List View Component
  const MobileListView = () => {
    const visibleReservations = reservations.slice(0, mobileVisibleCount)
    const hasMore = reservations.length > mobileVisibleCount
    
    return (
      <div className="d-md-none">
        {visibleReservations.map((reservation) => {
        const isExpanded = expandedId === reservation.id
        const isNearest = isNearestReservation(reservation.id)
        
        return (
          <div
            key={reservation.id}
            className={`reservation-list-item ${isExpanded ? 'expanded' : ''} ${isNearest ? 'nearest' : ''}`}
            onClick={() => toggleExpanded(reservation.id, reservation.isNew)}
          >
            <div className="d-flex align-items-start gap-3">
              {/* Avatar */}
              <div className="reservation-avatar">
                {getInitials(reservation.guestName)}
              </div>
              
              {/* Main Content */}
              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <h6 className="mb-0 fw-bold" style={{ fontSize: '1rem', color: 'white' }}>
                    {reservation.guestName}
                  </h6>
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
                <div className="small mb-2" style={{ color: 'rgba(249, 147, 251, 0.8)' }}>
                  {formatDate(reservation.checkIn)} - {formatDate(reservation.checkOut)}
                </div>
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <span className="small" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    <strong style={{ color: 'white' }}>{reservation.nights}</strong> לילות
                  </span>
                  <span className="small" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    {reservation.source ?? 'לא צוין'}
                  </span>
                  <span className="fw-bold" style={{ color: '#f093fb' }}>
                    {formatCurrency(reservation.total)}
                  </span>
                </div>
              </div>
              
              {/* Chevron Icon */}
              <div style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(180deg)' }}>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  style={{ color: '#f093fb' }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>
            
            {/* Expanded Details */}
            {isExpanded && (
              <div className="reservation-details-card">
                <div className="reservation-detail-row">
                  <span className="reservation-detail-label">מזהה הזמנה</span>
                  <span className="reservation-detail-value fw-semibold">{reservation.id}</span>
                </div>
                
                <div className="reservation-detail-row">
                  <span className="reservation-detail-label">סטטוס</span>
                  <span className="reservation-detail-value">
                    <span className={`badge ${getStatusClass(reservation.status)}`}>
                      {formatStatus(reservation.status)}
                    </span>
                  </span>
                </div>
                
                <div className="reservation-detail-row">
                  <span className="reservation-detail-label">מספר אורחים</span>
                  <span className="reservation-detail-value">
                    {reservation.adults || reservation.children ? (
                      <>
                        {reservation.adults ? `${reservation.adults} מבוגרים` : ''}
                        {reservation.adults && reservation.children ? ' + ' : ''}
                        {reservation.children ? `${reservation.children} ילדים` : ''}
                      </>
                    ) : reservation.guests ? (
                      reservation.guests
                    ) : (
                      '—'
                    )}
                  </span>
                </div>
                
                {reservation.phone && (
                  <div className="reservation-detail-row">
                    <span className="reservation-detail-label">טלפון</span>
                    <a 
                      href={`tel:${reservation.phone}`} 
                      className="reservation-detail-value text-decoration-none"
                      style={{ color: '#f093fb' }}
                    >
                      {reservation.phone}
                    </a>
                  </div>
                )}
                
                {reservation.email && (
                  <div className="reservation-detail-row">
                    <span className="reservation-detail-label">אימייל</span>
                    <a 
                      href={`mailto:${reservation.email}`} 
                      className="reservation-detail-value text-decoration-none" 
                      style={{ fontSize: '0.8rem', color: '#f093fb' }}
                    >
                      {reservation.email}
                    </a>
                  </div>
                )}
                
                <div className="reservation-detail-row">
                  <span className="reservation-detail-label">מקור הזמנה</span>
                  <span className="reservation-detail-value">{reservation.source ?? '—'}</span>
                </div>
                
                <div className="reservation-detail-row">
                  <span className="reservation-detail-label">סכום כולל</span>
                  <span className="reservation-detail-value fw-bold" style={{ color: '#667eea' }}>
                    {formatCurrency(reservation.total)}
                  </span>
                </div>
                
                {reservation.notes && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div className="reservation-detail-label mb-2">הערות</div>
                    <div className="small" style={{ 
                      background: 'rgba(255, 255, 255, 0.05)', 
                      padding: '12px', 
                      borderRadius: '8px',
                      lineHeight: '1.6',
                      color: 'rgba(255, 255, 255, 0.9)',
                      border: '1px solid rgba(249, 147, 251, 0.1)'
                    }}>
                      {reservation.notes}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      
      {/* Show More Button */}
      {hasMore && (
        <div className="d-flex justify-content-center mt-3">
          <button
            type="button"
            onClick={() => setMobileVisibleCount(prev => prev + 6)}
            className="btn btn-sm"
            style={{
              background: 'transparent',
              border: '1px solid rgba(102, 126, 234, 0.3)',
              color: 'rgba(249, 147, 251, 0.9)',
              padding: '8px 16px',
              fontSize: '0.85rem',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)'
              e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)'
            }}
          >
            הצג עוד ({reservations.length - mobileVisibleCount} נוספות)
          </button>
        </div>
      )}
    </div>
    )
  }

  return (
    <>
      <style>{styles}</style>
      
      {/* Mobile View - Stacked List */}
      <MobileListView />
      
      {/* Desktop View - Table */}
      <div className="d-none d-md-block table-responsive dashboard-table-scroll-container">
      <table className="table align-middle">
        <thead>
          <tr className="text-muted small">
            <th style={{ width: '30px' }}></th>
            <th>אורח</th>
            <th>תאריכים</th>
            <th>לילות</th>
            <th>מקור</th>
            <th>סה״כ</th>
            <th>סטטוס</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((reservation) => (
            <React.Fragment key={reservation.id}>
              <tr 
                onClick={() => toggleExpanded(reservation.id, reservation.isNew)}
                style={{ cursor: 'pointer' }}
                className={`${expandedId === reservation.id ? 'table-active' : ''} ${isNearestReservation(reservation.id) ? 'nearest-reservation' : ''}`}
              >
                <td>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{
                      transform: expandedId === reservation.id ? 'rotate(90deg)' : 'rotate(180deg)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </td>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-semibold">{reservation.guestName}</span>
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
                <td className="small">
                  {formatDate(reservation.checkIn)} - {formatDate(reservation.checkOut)}
                </td>
                <td>{reservation.nights}</td>
                <td className="small">{reservation.source ?? '—'}</td>
                <td className="fw-semibold">{formatCurrency(reservation.total)}</td>
                <td>
                  <span className={`badge ${getStatusClass(reservation.status)}`}>
                    {formatStatus(reservation.status)}
                  </span>
                </td>
              </tr>
              {expandedId === reservation.id ? (
                <tr>
                  <td colSpan={7} style={{ backgroundColor: '#f8f9fa' }}>
                    <div className="p-3">
                      <div className="row g-3">
                        <div className="col-md-6">
                          <div className="small text-muted mb-1">מזהה הזמנה</div>
                          <div className="fw-semibold">{reservation.id}</div>
                        </div>
                        <div className="col-md-6">
                          <div className="small text-muted mb-1">שם אורח מלא</div>
                          <div className="fw-semibold">{reservation.guestName}</div>
                        </div>
                        <div className="col-md-6">
                          <div className="small text-muted mb-1">תאריך כניסה</div>
                          <div>{formatDate(reservation.checkIn)}</div>
                        </div>
                        <div className="col-md-6">
                          <div className="small text-muted mb-1">תאריך יציאה</div>
                          <div>{formatDate(reservation.checkOut)}</div>
                        </div>
                        <div className="col-md-6">
                          <div className="small text-muted mb-1">מספר לילות</div>
                          <div>{reservation.nights}</div>
                        </div>
                        <div className="col-md-6">
                          <div className="small text-muted mb-1">מספר אורחים</div>
                          <div>
                            {reservation.adults || reservation.children ? (
                              <>
                                {reservation.adults ? `${reservation.adults} מבוגרים` : ''}
                                {reservation.adults && reservation.children ? ' + ' : ''}
                                {reservation.children ? `${reservation.children} ילדים` : ''}
                              </>
                            ) : reservation.guests ? (
                              reservation.guests
                            ) : (
                              '—'
                            )}
                          </div>
                        </div>
                        {reservation.phone ? (
                          <div className="col-md-6">
                            <div className="small text-muted mb-1">טלפון</div>
                            <div>
                              <a href={`tel:${reservation.phone}`} className="text-decoration-none">
                                {reservation.phone}
                              </a>
                            </div>
                          </div>
                        ) : null}
                        {reservation.email ? (
                          <div className="col-md-6">
                            <div className="small text-muted mb-1">אימייל</div>
                            <div>
                              <a href={`mailto:${reservation.email}`} className="text-decoration-none">
                                {reservation.email}
                              </a>
                            </div>
                          </div>
                        ) : null}
                        <div className="col-md-6">
                          <div className="small text-muted mb-1">מקור הזמנה</div>
                          <div>{reservation.source ?? '—'}</div>
                        </div>
                        <div className="col-md-6">
                          <div className="small text-muted mb-1">סכום כולל</div>
                          <div className="fw-bold">{formatCurrency(reservation.total)}</div>
                        </div>
                        {reservation.notes ? (
                          <div className="col-12">
                            <div className="small text-muted mb-1">הערות</div>
                            <div className="border rounded p-2 bg-white">{reservation.notes}</div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      </div>
    </>
  )
}

export default ReservationsTable
