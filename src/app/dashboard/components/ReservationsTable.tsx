'use client'

import React, { useState } from 'react'
import { Phone, Pencil, X, Sparkles, Map, Plane, Home, Hotel, Globe, Bird, FileText } from 'lucide-react'
import { Icon } from '@iconify/react'
import type { Reservation } from '@/lib/dashboard/types'
import { formatCurrency, formatDate, formatStatus } from '@/lib/dashboard/utils'
import { normalizePhoneNumber, formatPhoneForDisplay } from '@/lib/utils/phoneFormatter'

/**
 * Call + WhatsApp icon-only buttons for a guest phone number — shared by the
 * mobile and desktop reservation-detail views. No number is shown, just large
 * (40px) circular tap targets, sized for comfortable use on a phone screen.
 */
const PhoneActions = ({ phone }: { phone: string }) => {
  const normalized = normalizePhoneNumber(phone)
  const whatsappUrl = `https://wa.me/${normalized.replace('+', '')}`
  const displayPhone = formatPhoneForDisplay(phone)

  const buttonStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    color: '#fff',
    flexShrink: 0,
  }

  return (
    <span className="d-inline-flex align-items-center gap-2">
      <a
        href={`tel:${normalized}`}
        className="d-inline-flex align-items-center justify-content-center"
        style={{ ...buttonStyle, background: '#f093fb' }}
        onClick={(e) => e.stopPropagation()}
        aria-label={`התקשר ל-${displayPhone}`}
        title={`התקשר ל-${displayPhone}`}
      >
        <Phone size={20} />
      </a>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="d-inline-flex align-items-center justify-content-center"
        style={{ ...buttonStyle, background: '#25D366' }}
        onClick={(e) => e.stopPropagation()}
        aria-label={`שלח הודעה בוואטסאפ ל-${displayPhone}`}
        title="שלח הודעה בוואטסאפ"
      >
        <Icon icon="mdi:whatsapp" style={{ fontSize: '22px' }} />
      </a>
    </span>
  )
}

// Reservation-specific accents (shared table shell lives in dashboard-surfaces.css)
const styles = `
  .dashboard-table-scroll-container tbody tr.current-stay-reservation {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.28) 0%, rgba(102, 126, 234, 0.22) 55%, rgba(118, 75, 162, 0.2) 100%) !important;
    box-shadow: none !important;
  }
  .dashboard-table-scroll-container tbody tr.current-stay-reservation:hover {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.36) 0%, rgba(102, 126, 234, 0.28) 55%, rgba(118, 75, 162, 0.26) 100%) !important;
    box-shadow: none !important;
  }
  .dashboard-table-scroll-container tbody tr.current-stay-reservation td {
    background: transparent !important;
    color: white !important;
  }
  .current-stay-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    background: rgba(34, 197, 94, 0.22);
    border: 1px solid rgba(74, 222, 128, 0.45);
    color: rgba(187, 247, 208, 0.98);
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    padding: 0.12rem 0.45rem;
    border-radius: 999px;
    white-space: nowrap;
    line-height: 1.2;
  }
  .current-stay-badge::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #4ade80;
    box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.2);
    flex-shrink: 0;
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
  .reservation-list-item.current-stay {
    box-shadow: none;
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.28) 0%, rgba(71, 85, 105, 0.95) 100%);
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
    case 'request':
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
  onEditReservation?: (reservation: Reservation) => void
  onDeleteReservation?: (reservation: Reservation) => void
  onIssueReceipt?: (reservation: Reservation) => void
  /** Booking IDs that already have a successfully issued receipt */
  receiptIssuedBookingIds?: Set<string>
}

const ReservationsTable = ({
  reservations,
  onReservationViewed,
  onEditReservation,
  onDeleteReservation,
  onIssueReceipt,
  receiptIssuedBookingIds,
}: ReservationsTableProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [mobileVisibleCount, setMobileVisibleCount] = useState(6)
  const [viewedReservations, setViewedReservations] = useState<Set<string>>(new Set())

  if (!reservations.length) {
    return <div className="text-muted">אין הזמנות להצגה כרגע.</div>
  }

  // Current in-house stay: checked in today or earlier, checkout still in the future
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const currentStayIds = new Set(
    reservations
      .filter((r) => {
        if (r.status === 'cancelled') return false
        const checkInDate = new Date(r.checkIn)
        const checkOutDate = new Date(r.checkOut)
        checkInDate.setHours(0, 0, 0, 0)
        checkOutDate.setHours(0, 0, 0, 0)
        return checkInDate.getTime() <= today.getTime() && checkOutDate.getTime() > today.getTime()
      })
      .map((r) => r.id)
  )

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

  const isCurrentStay = (id: string) => currentStayIds.has(id)
  
  const isReservationViewed = (id: string) => viewedReservations.has(id)

  // Get platform logo/icon based on reservation source
  const getPlatformIcon = (source: string | null | undefined, size: number = 24) => {
    const sourceLower = (source || '').toLowerCase()
    
    // Container style for consistent alignment
    const containerStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: `${size}px`,
      height: `${size}px`,
      flexShrink: 0,
    }
    
    if (sourceLower.includes('airbnb')) {
      // Airbnb logo
      return (
        <span style={containerStyle}>
          <img 
            src="/airbnb-logo.png" 
            alt="Airbnb" 
            width={size} 
            height={size}
            style={{ 
              display: 'block',
              borderRadius: '50%',
              objectFit: 'cover'
            }} 
          />
        </span>
      )
    }
    if (sourceLower.includes('booking')) {
      // Booking.com logo
      return (
        <span style={containerStyle}>
          <img 
            src="/booking-logo.png" 
            alt="Booking.com" 
            width={size} 
            height={size}
            style={{ 
              display: 'block',
              borderRadius: '50%',
              objectFit: 'cover'
            }} 
          />
        </span>
      )
    }
    if (sourceLower.includes('agoda')) {
      return <span style={{ ...containerStyle, color: 'rgba(226,232,255,0.9)' }}><Map size={Math.round(size * 0.85)} strokeWidth={1.75} /></span>
    }
    if (sourceLower.includes('expedia')) {
      return <span style={{ ...containerStyle, color: 'rgba(226,232,255,0.9)' }}><Plane size={Math.round(size * 0.85)} strokeWidth={1.75} /></span>
    }
    if (sourceLower.includes('vrbo') || sourceLower.includes('homeaway')) {
      return <span style={{ ...containerStyle, color: 'rgba(226,232,255,0.9)' }}><Home size={Math.round(size * 0.85)} strokeWidth={1.75} /></span>
    }
    if (sourceLower.includes('tripadvisor')) {
      return <span style={{ ...containerStyle, color: 'rgba(226,232,255,0.9)' }}><Bird size={Math.round(size * 0.85)} strokeWidth={1.75} /></span>
    }
    if (sourceLower.includes('hotels.com')) {
      return <span style={{ ...containerStyle, color: 'rgba(226,232,255,0.9)' }}><Hotel size={Math.round(size * 0.85)} strokeWidth={1.75} /></span>
    }
    // הזמנה ישירה או לא מוכר
    return <span style={{ ...containerStyle, color: 'rgba(226,232,255,0.9)' }}><Globe size={Math.round(size * 0.85)} strokeWidth={1.75} /></span>
  }

  // Mobile List View Component
  const MobileListView = () => {
    const visibleReservations = reservations.slice(0, mobileVisibleCount)
    const hasMore = reservations.length > mobileVisibleCount
    
    return (
      <div className="d-md-none">
        {visibleReservations.map((reservation) => {
        const isExpanded = expandedId === reservation.id
        const isCurrent = isCurrentStay(reservation.id)
        
        return (
          <div
            key={reservation.id}
            className={`reservation-list-item ${isExpanded ? 'expanded' : ''} ${isCurrent ? 'current-stay' : ''}`}
            onClick={() => toggleExpanded(reservation.id, reservation.isNew)}
          >
            <div className="d-flex align-items-start gap-3">
              {/* Avatar */}
              <div className="reservation-avatar">
                {getPlatformIcon(reservation.source, 32)}
              </div>
              
              {/* Main Content */}
              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                  <h6 className="mb-0 fw-bold" style={{ fontSize: '1rem', color: 'white' }}>
                    {reservation.guestName}
                  </h6>
                  {isCurrent && <span className="current-stay-badge">בנכס</span>}
                </div>
                <div className="small mb-2" style={{ color: 'rgba(249, 147, 251, 0.8)' }}>
                  {formatDate(reservation.checkIn)} - {formatDate(reservation.checkOut)}
                </div>
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <span className="small" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    <strong style={{ color: 'white' }}>{reservation.nights}</strong> לילות
                  </span>
                  <span className="small" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    <strong style={{ color: 'white' }}>
                      {reservation.adults && reservation.children ? (
                        <>
                          {reservation.adults + reservation.children}
                        </>
                      ) : reservation.guests ? (
                        reservation.guests
                      ) : (
                        '—'
                      )}
                    </strong> אורחים
                  </span>
                  <span className="fw-bold" style={{ color: '#f093fb' }}>
                    {formatCurrency(reservation.total)}
                  </span>
                </div>
              </div>
              
              {/* New Badge and Chevron Icon */}
              <div className="d-flex align-items-center gap-2">
                {reservation.isNew && !isReservationViewed(reservation.id) && (
                  <span 
                    className="badge d-inline-flex align-items-center gap-1" 
                    style={{
                      background: 'linear-gradient(135deg, #a855f7 0%, #f093fb 100%)',
                      color: 'white',
                      fontSize: '0.7rem',
                      padding: '2px 6px',
                      boxShadow: '0 2px 8px rgba(168, 85, 247, 0.3)',
                    }}
                  >
                    חדש
                    <Sparkles size={11} />
                  </span>
                )}
                
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
                    <span
                      className={`badge ${getStatusClass(reservation.status)}`}
                      style={
                        reservation.status === 'request'
                          ? { border: '1px dashed rgba(0,0,0,0.35)' }
                          : undefined
                      }
                    >
                      {formatStatus(reservation.status)}
                    </span>
                  </span>
                </div>

                {onIssueReceipt &&
                  reservation.status !== 'cancelled' &&
                  !receiptIssuedBookingIds?.has(reservation.id) && (
                  <div className="mt-2 mb-2">
                    <button
                      type="button"
                      className="hostly-btn hostly-btn-primary w-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        onIssueReceipt(reservation)
                      }}
                    >
                      <FileText size={16} />
                      הוצא קבלה / חשבונית
                    </button>
                  </div>
                )}
                {receiptIssuedBookingIds?.has(reservation.id) && (
                  <div
                    className="mt-2 mb-2 small text-center py-2 rounded"
                    style={{
                      background: 'rgba(34,197,94,0.15)',
                      border: '1px solid rgba(74,222,128,0.35)',
                      color: 'rgba(187,247,208,0.95)',
                    }}
                  >
                    הופקה קבלה להזמנה זו
                  </div>
                )}
                
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
                    <span className="reservation-detail-value">
                      <PhoneActions phone={reservation.phone} />
                    </span>
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
                  <span className="reservation-detail-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {getPlatformIcon(reservation.source, 20)}
                    <span>{reservation.source ?? '—'}</span>
                  </span>
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
                
                {/* Action Buttons for Direct bookings */}
                {(onEditReservation || onDeleteReservation) &&
                  reservation.source &&
                  reservation.source.toLowerCase().includes('direct') && (
                  <div className="mt-3 pt-3 d-flex gap-2 flex-wrap" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    {onEditReservation && (
                      <button
                        type="button"
                        className="hostly-btn hostly-btn-sm hostly-btn-primary flex-grow-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditReservation(reservation)
                        }}
                      >
                        <Pencil size={14} />
                        ערוך
                      </button>
                    )}
                    {onDeleteReservation && (
                      <button
                        type="button"
                        className="hostly-btn hostly-btn-sm hostly-btn-danger flex-grow-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteReservation(reservation)
                        }}
                      >
                        <X size={14} />
                        בטל
                      </button>
                    )}
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
              border: '1px solid #CED7E0',
              color: '#7133D9',
              padding: '8px 20px',
              fontSize: '0.875rem',
              fontWeight: 500,
              borderRadius: '8px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#EFEBFF'
              e.currentTarget.style.borderColor = '#7133D9'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = '#CED7E0'
            }}
          >
            הצג עוד
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
                className={`${expandedId === reservation.id ? 'table-active' : ''} ${isCurrentStay(reservation.id) ? 'current-stay-reservation' : ''}`}
              >
                <td>
                  <div className="d-flex align-items-center gap-2">
                    {reservation.isNew && !isReservationViewed(reservation.id) && (
                      <span 
                        className="badge d-inline-flex align-items-center gap-1" 
                        style={{
                          background: 'linear-gradient(135deg, #a855f7 0%, #f093fb 100%)',
                          color: 'white',
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          boxShadow: '0 2px 8px rgba(168, 85, 247, 0.3)',
                        }}
                      >
                        חדש
                        <Sparkles size={11} />
                      </span>
                    )}
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
                  </div>
                </td>
                <td>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="fw-semibold">{reservation.guestName}</span>
                    {isCurrentStay(reservation.id) && <span className="current-stay-badge">בנכס</span>}
                  </div>
                </td>
                <td className="small">
                  {formatDate(reservation.checkIn)} - {formatDate(reservation.checkOut)}
                </td>
                <td>{reservation.nights}</td>
                <td className="small">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {getPlatformIcon(reservation.source, 20)}
                    <span>{reservation.source ?? '—'}</span>
                  </div>
                </td>
                <td className="fw-semibold">{formatCurrency(reservation.total)}</td>
                <td>
                  <span
                    className={`badge ${getStatusClass(reservation.status)}`}
                    style={
                      reservation.status === 'request'
                        ? { border: '1px dashed rgba(0,0,0,0.35)' }
                        : undefined
                    }
                  >
                    {formatStatus(reservation.status)}
                  </span>
                </td>
              </tr>
              {expandedId === reservation.id ? (
                <tr>
                  <td colSpan={7} style={{ 
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderTop: '1px solid rgba(249, 147, 251, 0.2)',
                  }}>
                    <div className="p-3">
                      <div className="row g-3">
                        {/* Info — two columns */}
                        <div className="col-md-8">
                          <div className="row g-3">
                            <div className="col-md-6">
                              <div className="small mb-1" style={{ color: 'rgba(249, 147, 251, 0.8)' }}>מזהה הזמנה</div>
                              <div className="fw-semibold" style={{ color: 'white' }}>{reservation.id}</div>
                            </div>
                            <div className="col-md-6">
                              <div className="small mb-1" style={{ color: 'rgba(249, 147, 251, 0.8)' }}>שם אורח מלא</div>
                              <div className="fw-semibold" style={{ color: 'white' }}>{reservation.guestName}</div>
                            </div>
                            <div className="col-md-6">
                              <div className="small mb-1" style={{ color: 'rgba(249, 147, 251, 0.8)' }}>תאריך כניסה</div>
                              <div style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{formatDate(reservation.checkIn)}</div>
                            </div>
                            <div className="col-md-6">
                              <div className="small mb-1" style={{ color: 'rgba(249, 147, 251, 0.8)' }}>תאריך יציאה</div>
                              <div style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{formatDate(reservation.checkOut)}</div>
                            </div>
                            <div className="col-md-6">
                              <div className="small mb-1" style={{ color: 'rgba(249, 147, 251, 0.8)' }}>מספר לילות</div>
                              <div style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{reservation.nights}</div>
                            </div>
                            <div className="col-md-6">
                              <div className="small mb-1" style={{ color: 'rgba(249, 147, 251, 0.8)' }}>מספר אורחים</div>
                              <div style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
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
                                <div className="small mb-1" style={{ color: 'rgba(249, 147, 251, 0.8)' }}>טלפון</div>
                                <div>
                                  <PhoneActions phone={reservation.phone} />
                                </div>
                              </div>
                            ) : null}
                            {reservation.email ? (
                              <div className="col-md-6">
                                <div className="small mb-1" style={{ color: 'rgba(249, 147, 251, 0.8)' }}>אימייל</div>
                                <div>
                                  <a href={`mailto:${reservation.email}`} className="text-decoration-none" style={{ color: '#f093fb' }}>
                                    {reservation.email}
                                  </a>
                                </div>
                              </div>
                            ) : null}
                            <div className="col-md-6">
                              <div className="small mb-1" style={{ color: 'rgba(249, 147, 251, 0.8)' }}>מקור הזמנה</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255, 255, 255, 0.9)' }}>
                                {getPlatformIcon(reservation.source, 20)}
                                <span>{reservation.source ?? '—'}</span>
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="small mb-1" style={{ color: 'rgba(249, 147, 251, 0.8)' }}>סכום כולל</div>
                              <div className="fw-bold" style={{ color: '#f093fb' }}>{formatCurrency(reservation.total)}</div>
                            </div>
                            {reservation.notes ? (
                              <div className="col-12">
                                <div className="small mb-1" style={{ color: 'rgba(249, 147, 251, 0.8)' }}>הערות</div>
                                <div className="border rounded p-2" style={{
                                  background: 'rgba(0, 0, 0, 0.2)',
                                  borderColor: 'rgba(249, 147, 251, 0.2)',
                                  color: 'rgba(255, 255, 255, 0.9)',
                                }}>{reservation.notes}</div>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Actions — third column */}
                        <div className="col-md-4">
                          <div
                            className="d-flex flex-column gap-2 h-100"
                            style={{
                              padding: '0.85rem',
                              borderRadius: 12,
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(249, 147, 251, 0.18)',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              className="small fw-semibold mb-1"
                              style={{ color: 'rgba(249, 147, 251, 0.85)' }}
                            >
                              פעולות
                            </div>
                            {onIssueReceipt &&
                              reservation.status !== 'cancelled' &&
                              !receiptIssuedBookingIds?.has(reservation.id) && (
                              <button
                                type="button"
                                className="hostly-btn hostly-btn-primary w-100"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onIssueReceipt(reservation)
                                }}
                              >
                                <FileText size={16} />
                                הוצא קבלה / חשבונית
                              </button>
                            )}
                            {receiptIssuedBookingIds?.has(reservation.id) && (
                              <div
                                className="small text-center py-2 rounded"
                                style={{
                                  background: 'rgba(34,197,94,0.15)',
                                  border: '1px solid rgba(74,222,128,0.35)',
                                  color: 'rgba(187,247,208,0.95)',
                                }}
                              >
                                הופקה קבלה להזמנה זו
                              </div>
                            )}
                            {onEditReservation &&
                              reservation.source &&
                              reservation.source.toLowerCase().includes('direct') && (
                              <button
                                type="button"
                                className="hostly-btn hostly-btn-sm hostly-btn-ghost w-100"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEditReservation(reservation)
                                }}
                              >
                                <Pencil size={14} />
                                ערוך הזמנה
                              </button>
                            )}
                            {onDeleteReservation &&
                              reservation.source &&
                              reservation.source.toLowerCase().includes('direct') && (
                              <button
                                type="button"
                                className="hostly-btn hostly-btn-sm hostly-btn-danger w-100"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDeleteReservation(reservation)
                                }}
                              >
                                <X size={14} />
                                בטל הזמנה
                              </button>
                            )}
                            {reservation.source &&
                              reservation.source.toLowerCase().includes('direct') &&
                              (onEditReservation || onDeleteReservation) && (
                              <p className="small mb-0 mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                עריכה/ביטול להזמנות ישירות בלבד
                              </p>
                            )}
                          </div>
                        </div>
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
