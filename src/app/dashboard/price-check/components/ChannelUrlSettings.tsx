'use client'

import React from 'react'
import { Link2, Save, X, Globe, HelpCircle } from 'lucide-react'
import type { ChannelUrlConfig } from '@/lib/pricing/onlinePriceFetcher'

interface ChannelUrlSettingsProps {
  roomId: string
  urls: ChannelUrlConfig
  onChange: (urls: ChannelUrlConfig) => void
  onSave: () => void
  onClose: () => void
  open: boolean
  isAutoDetected?: {
    airbnb?: boolean
    booking?: boolean
    direct?: boolean
  }
}

export default function ChannelUrlSettings({
  roomId,
  urls,
  onChange,
  onSave,
  onClose,
  open,
  isAutoDetected,
}: ChannelUrlSettingsProps) {
  if (!open) return null

  return (
    <div
      className="card border-0 shadow-sm hostly-dark-card mb-4"
      data-testid="channel-url-settings-card"
      dir="rtl"
      style={{ border: '1px solid var(--hb-200)' }}
    >
      <div
        className="card-header border-0 py-3 px-4 d-flex align-items-center justify-content-between"
        style={{
          borderBottom: '1px solid var(--hborder-light)',
          background: 'var(--hb-50)',
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <Link2 size={18} style={{ color: 'var(--hb)' }} />
          <h3 className="mb-0 fw-bold" style={{ color: 'var(--htxt-1)', fontSize: '1rem' }}>
            הגדרת קישורי ערוצים לנכס {roomId ? `(יחידה ${roomId})` : ''}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-sm btn-light p-1"
          style={{ borderRadius: '6px' }}
          aria-label="סגור הגדרות"
        >
          <X size={16} />
        </button>
      </div>

      <div className="card-body p-3 p-md-4">
        <p className="text-muted small mb-3">
          המערכת מזהה אוטומטית את קישורי הנכס מתוך הגדרות Beds24 ואתר ההזמנות שלכם. באפשרותכם לעדכן או לדרוס את הקישור לכל ערוץ כאן.
        </p>

        <div className="row g-3">
          {/* Airbnb */}
          <div className="col-12 col-md-4">
            <div className="d-flex align-items-center justify-content-between mb-1.5">
              <label className="form-label small fw-semibold d-flex align-items-center gap-1.5 mb-0" style={{ color: 'var(--htxt-1)' }}>
                <img src="/airbnb-logo.png" alt="Airbnb" style={{ width: 18, height: 18, borderRadius: '50%' }} />
                קישור / מזהה רישום Airbnb
              </label>
              {isAutoDetected?.airbnb && (
                <span className="badge rounded-pill" style={{ background: '#ecfdf5', color: '#047857', fontSize: '0.7rem' }}>
                  זוהה אוטומטית
                </span>
              )}
            </div>
            <input
              type="text"
              className="form-control"
              placeholder="לדוגמה: 12345678 או קישור מלא"
              value={urls.airbnb || ''}
              onChange={(e) => onChange({ ...urls, airbnb: e.target.value })}
              style={{ fontSize: '0.88rem' }}
              data-testid="airbnb-url-input"
            />
            <span className="text-muted small mt-1 d-block" style={{ fontSize: '0.75rem' }}>
              מספר מודעה או כתובת airbnb.com/rooms/...
            </span>
          </div>

          {/* Booking.com */}
          <div className="col-12 col-md-4">
            <div className="d-flex align-items-center justify-content-between mb-1.5">
              <label className="form-label small fw-semibold d-flex align-items-center gap-1.5 mb-0" style={{ color: 'var(--htxt-1)' }}>
                <img src="/booking-logo.png" alt="Booking.com" style={{ width: 18, height: 18, borderRadius: '50%' }} />
                קישור / סלאג Booking.com
              </label>
              {isAutoDetected?.booking && (
                <span className="badge rounded-pill" style={{ background: '#ecfdf5', color: '#047857', fontSize: '0.7rem' }}>
                  זוהה אוטומטית
                </span>
              )}
            </div>
            <input
              type="text"
              className="form-control"
              placeholder="לדוגמה: hotel-name או קישור מלא"
              value={urls.booking || ''}
              onChange={(e) => onChange({ ...urls, booking: e.target.value })}
              style={{ fontSize: '0.88rem' }}
              data-testid="booking-url-input"
            />
            <span className="text-muted small mt-1 d-block" style={{ fontSize: '0.75rem' }}>
              מזהה מלון או כתובת booking.com/hotel/...
            </span>
          </div>

          {/* Direct Website */}
          <div className="col-12 col-md-4">
            <div className="d-flex align-items-center justify-content-between mb-1.5">
              <label className="form-label small fw-semibold d-flex align-items-center gap-1.5 mb-0" style={{ color: 'var(--htxt-1)' }}>
                <Globe size={18} style={{ color: 'var(--hb)' }} />
                אתר ישיר / סלאג אתר Hostly
              </label>
              {isAutoDetected?.direct && (
                <span className="badge rounded-pill" style={{ background: '#ecfdf5', color: '#047857', fontSize: '0.7rem' }}>
                  זוהה אוטומטית
                </span>
              )}
            </div>
            <input
              type="text"
              className="form-control"
              placeholder="לדוגמה: my-property או קישור מלא"
              value={urls.direct || ''}
              onChange={(e) => onChange({ ...urls, direct: e.target.value })}
              style={{ fontSize: '0.88rem' }}
              data-testid="direct-url-input"
            />
            <span className="text-muted small mt-1 d-block" style={{ fontSize: '0.75rem' }}>
              כתובת אתר ההזמנות הישיר
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 d-flex justify-content-end gap-2" style={{ borderTop: '1px solid var(--hborder-light)' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm btn-outline-secondary"
            style={{ borderRadius: '6px' }}
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={onSave}
            className="hostly-btn hostly-btn-primary btn-sm d-flex align-items-center gap-1.5"
            style={{ borderRadius: '6px', padding: '6px 16px' }}
            data-testid="save-urls-btn"
          >
            <Save size={14} />
            <span>שמור קישורים</span>
          </button>
        </div>
      </div>
    </div>
  )
}
