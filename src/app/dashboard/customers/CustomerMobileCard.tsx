'use client'

import React from 'react'
import {
  Phone,
  PhoneCall,
  Mail,
  MessageCircle,
  Calendar,
} from 'lucide-react'
import { normalizePhoneNumber, formatPhoneForDisplay } from '@/lib/utils/phoneFormatter'
import { Customer, getPlatformIcon, getSourceLabel } from './customerHelpers'

interface CustomerMobileCardProps {
  customer: Customer
  index: number
}

export default function CustomerMobileCard({ customer, index }: CustomerMobileCardProps) {
  const initial = customer.fullName.trim() ? customer.fullName.trim().charAt(0).toUpperCase() : '?'
  const normalizedPhone = customer.phone ? normalizePhoneNumber(customer.phone) : null
  const whatsappDigits = normalizedPhone ? normalizedPhone.replace(/[^0-9]/g, '') : ''

  return (
    <div
      className="card border-0 shadow-sm hostly-dark-card customer-mobile-card"
      data-testid="customer-card"
      style={{
        borderRadius: '12px',
        background: 'var(--hsurf)',
        border: '1px solid var(--hn-200)',
      }}
    >
      <div className="card-body p-3">
        {/* Header: Avatar + Full Name + Booking Count + Platform Badge */}
        <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
          <div className="d-flex align-items-center gap-2.5" style={{ minWidth: 0 }}>
            <div
              className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
              style={{
                width: 40,
                height: 40,
                background: 'var(--hb-100)',
                color: 'var(--hb)',
                fontWeight: 700,
                fontSize: '1rem',
                border: '1px solid var(--hb-200)',
              }}
              aria-hidden="true"
            >
              {initial}
            </div>
            <div style={{ minWidth: 0 }}>
              <strong
                data-testid="customer-name"
                className="d-block text-truncate"
                style={{
                  color: 'var(--htxt-1)',
                  fontSize: '1rem',
                  lineHeight: 1.3,
                  fontWeight: 600,
                }}
              >
                {customer.fullName}
              </strong>
              <span
                style={{
                  color: 'var(--htxt-3)',
                  fontSize: '0.8rem',
                }}
              >
                {customer.totalBookings > 1 ? `${customer.totalBookings} הזמנות` : 'הזמנה אחת'}
              </span>
            </div>
          </div>

          {/* Booking Source Badge */}
          <div
            className="d-inline-flex align-items-center gap-1.5 px-2.5 py-1 rounded-pill flex-shrink-0"
            style={{
              background: 'var(--hn-100)',
              border: '1px solid var(--hn-200)',
              fontSize: '0.775rem',
              color: 'var(--htxt-2)',
              fontWeight: 500,
            }}
          >
            {getPlatformIcon(customer.bookingSource, 18)}
            <span>{getSourceLabel(customer.bookingSource)}</span>
          </div>
        </div>

        {/* Contact Info Section */}
        <div
          className="d-flex flex-column gap-2 pt-2 border-top"
          style={{ borderColor: 'var(--hn-200)' }}
        >
          {/* Phone */}
          <div className="d-flex align-items-center justify-content-between gap-2">
            <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
              <div
                className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                style={{
                  width: 28,
                  height: 28,
                  background: customer.phone ? 'var(--hb-50)' : 'var(--hn-100)',
                  color: customer.phone ? 'var(--hb)' : 'var(--htxt-3)',
                  opacity: customer.phone ? 1 : 0.6,
                }}
              >
                <Phone size={14} />
              </div>
              {customer.phone ? (
                <a
                  href={`tel:${normalizedPhone}`}
                  className="text-decoration-none text-truncate"
                  data-testid="customer-phone-link"
                  style={{ color: 'var(--hb)', fontWeight: 600, fontSize: '0.9rem' }}
                  dir="ltr"
                >
                  {formatPhoneForDisplay(customer.phone)}
                </a>
              ) : (
                <span style={{ color: 'var(--htxt-3)', fontSize: '0.85rem' }}>אין מספר טלפון</span>
              )}
            </div>

            {customer.phone && (
              <div className="d-flex align-items-center gap-1.5 flex-shrink-0">
                <a
                  href={`tel:${normalizedPhone}`}
                  className="btn btn-sm p-0 rounded-circle d-inline-flex align-items-center justify-content-center"
                  style={{
                    width: 32,
                    height: 32,
                    background: 'var(--hb-100)',
                    color: 'var(--hb)',
                    border: '1px solid var(--hb-200)',
                  }}
                  title="חיוג"
                  aria-label={`חייג אל ${customer.fullName}`}
                >
                  <PhoneCall size={14} />
                </a>
                <a
                  href={`https://wa.me/${whatsappDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm p-0 rounded-circle d-inline-flex align-items-center justify-content-center"
                  style={{
                    width: 32,
                    height: 32,
                    background: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                  }}
                  title="וואטסאפ"
                  aria-label={`שלח הודעת וואטסאפ אל ${customer.fullName}`}
                >
                  <MessageCircle size={14} />
                </a>
              </div>
            )}
          </div>

          {/* Email */}
          <div className="d-flex align-items-center justify-content-between gap-2">
            <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
              <div
                className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                style={{
                  width: 28,
                  height: 28,
                  background: customer.email ? 'var(--hb-50)' : 'var(--hn-100)',
                  color: customer.email ? 'var(--hb)' : 'var(--htxt-3)',
                  opacity: customer.email ? 1 : 0.6,
                }}
              >
                <Mail size={14} />
              </div>
              {customer.email ? (
                <a
                  href={`mailto:${customer.email}`}
                  className="text-decoration-none text-truncate"
                  data-testid="customer-email-link"
                  style={{ color: 'var(--hb)', fontSize: '0.875rem' }}
                  dir="ltr"
                >
                  {customer.email}
                </a>
              ) : (
                <span style={{ color: 'var(--htxt-3)', fontSize: '0.85rem' }}>אין כתובת אימייל</span>
              )}
            </div>

            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                className="btn btn-sm p-0 rounded-circle d-inline-flex align-items-center justify-content-center flex-shrink-0"
                style={{
                  width: 32,
                  height: 32,
                  background: 'var(--hn-100)',
                  color: 'var(--htxt-2)',
                  border: '1px solid var(--hn-200)',
                }}
                title="שליחת אימייל"
                aria-label={`שלח אימייל אל ${customer.fullName}`}
              >
                <Mail size={14} />
              </a>
            )}
          </div>
        </div>

        {/* Booking Dates Tile */}
        <div
          className="mt-3 p-2.5 rounded-2 d-flex align-items-center justify-content-between"
          style={{
            background: 'var(--hn-50)',
            border: '1px solid var(--hn-200)',
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <Calendar size={14} style={{ color: 'var(--htxt-3)', flexShrink: 0 }} />
            <div className="d-flex flex-column">
              <span style={{ color: 'var(--htxt-3)', fontSize: '0.72rem' }}>הזמנה ראשונה</span>
              <span className="fw-semibold" style={{ color: 'var(--htxt-1)', fontSize: '0.82rem' }}>
                {customer.firstBookingDate ? new Date(customer.firstBookingDate).toLocaleDateString('he-IL') : '—'}
              </span>
            </div>
          </div>

          <div style={{ width: 1, height: 26, background: 'var(--hn-300)', opacity: 0.5 }} />

          <div className="d-flex align-items-center gap-2">
            <Calendar size={14} style={{ color: 'var(--htxt-3)', flexShrink: 0 }} />
            <div className="d-flex flex-column text-end">
              <span style={{ color: 'var(--htxt-3)', fontSize: '0.72rem' }}>הזמנה אחרונה</span>
              <span className="fw-semibold" style={{ color: 'var(--htxt-1)', fontSize: '0.82rem' }}>
                {customer.lastBookingDate ? new Date(customer.lastBookingDate).toLocaleDateString('he-IL') : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
