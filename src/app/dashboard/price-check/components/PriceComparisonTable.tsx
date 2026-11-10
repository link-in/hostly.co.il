'use client'

import React from 'react'
import {
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Globe,
  HelpCircle,
  ShieldAlert,
  ArrowUpDown,
  Search,
} from 'lucide-react'
import type { OnlineChannelPriceResult } from '@/lib/pricing/onlinePriceFetcher'
import { formatCurrency } from '@/lib/dashboard/utils'

interface PriceComparisonTableProps {
  channels: OnlineChannelPriceResult[]
  basePrice: number
  nights: number
  isScanning: boolean
  onRescanAll: () => void
  onRescanChannel: (channelKey: 'airbnb' | 'booking' | 'direct') => void
  onOpenSettings?: () => void
}

export default function PriceComparisonTable({
  channels,
  basePrice,
  nights,
  isScanning,
  onRescanAll,
  onRescanChannel,
  onOpenSettings,
}: PriceComparisonTableProps) {
  const getChannelLogo = (channelKey: string) => {
    switch (channelKey) {
      case 'airbnb':
        return '/airbnb-logo.png'
      case 'booking':
        return '/booking-logo.png'
      default:
        return null
    }
  }

  const renderStatusBadge = (channel: OnlineChannelPriceResult) => {
    if (channel.status === 'bot_protected') {
      return (
        <span
          className="badge d-inline-flex align-items-center gap-1 text-wrap text-start"
          style={{
            background: '#fef3c7',
            color: '#b45309',
            border: '1px solid #fde68a',
            padding: '5px 10px',
            fontSize: '0.8rem',
            lineHeight: 1.3,
          }}
          title={channel.statusMessage}
        >
          <ShieldAlert size={14} className="flex-shrink-0" />
          <span>מוגן בוטים (בדוק בלחיצה)</span>
        </span>
      )
    }

    if (channel.status === 'no_url') {
      return (
        <span
          className="badge d-inline-flex align-items-center gap-1"
          style={{
            background: '#f3f4f6',
            color: '#6b7280',
            border: '1px solid #e5e7eb',
            padding: '5px 10px',
            fontSize: '0.8rem',
          }}
        >
          <HelpCircle size={14} />
          <span>לא הוגדר קישור</span>
        </span>
      )
    }

    if (channel.status === 'error') {
      return (
        <span
          className="badge d-inline-flex align-items-center gap-1"
          style={{
            background: '#fee2e2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            padding: '5px 10px',
            fontSize: '0.8rem',
          }}
        >
          <AlertTriangle size={14} />
          <span>שגיאה בסריקה</span>
        </span>
      )
    }

    if (channel.status === 'not_found') {
      return (
        <span
          className="badge d-inline-flex align-items-center gap-1"
          style={{
            background: '#fef3c7',
            color: '#b45309',
            border: '1px solid #fde68a',
            padding: '5px 10px',
            fontSize: '0.8rem',
          }}
        >
          <HelpCircle size={14} />
          <span>מחיר לא אותר</span>
        </span>
      )
    }

    if (channel.matchStatus === 'matched') {
      return (
        <span
          className="badge d-inline-flex align-items-center gap-1"
          style={{
            background: '#ecfdf5',
            color: '#047857',
            border: '1px solid #a7f3d0',
            padding: '5px 10px',
            fontSize: '0.8rem',
          }}
          data-testid={`match-badge-${channel.channelKey}`}
        >
          <CheckCircle2 size={14} />
          <span>תואם במדויק</span>
        </span>
      )
    }

    if (channel.matchStatus === 'discrepancy') {
      const isHigher = (channel.diff || 0) > 0
      return (
        <span
          className="badge d-inline-flex align-items-center gap-1"
          style={{
            background: isHigher ? '#fff7ed' : '#fef2f2',
            color: isHigher ? '#c2410c' : '#b91c1c',
            border: `1px solid ${isHigher ? '#ffedd5' : '#fee2e2'}`,
            padding: '5px 10px',
            fontSize: '0.8rem',
          }}
          data-testid={`match-badge-${channel.channelKey}`}
        >
          <AlertTriangle size={14} />
          <span>{channel.matchMessage}</span>
        </span>
      )
    }

    return (
      <span className="badge bg-light text-muted">
        בבדיקה
      </span>
    )
  }

  const matchesCount = channels.filter((c) => c.matchStatus === 'matched').length
  const discrepanciesCount = channels.filter((c) => c.matchStatus === 'discrepancy').length

  return (
    <div
      className="card border-0 shadow-sm hostly-dark-card overflow-hidden mt-4"
      data-testid="price-comparison-table-card"
      dir="rtl"
    >
      {/* Header */}
      <div
        className="p-3 p-md-4 d-flex flex-wrap align-items-center justify-content-between gap-3"
        style={{
          borderBottom: '1px solid var(--hborder-light)',
          background: 'var(--hn-50)',
        }}
      >
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <ArrowUpDown size={18} style={{ color: 'var(--hb)' }} />
            <h3 className="mb-0 fw-bold" style={{ color: 'var(--htxt-1)', fontSize: '1.1rem' }}>
              טבלת השוואת מחירים רב-ערוצית
            </h3>
          </div>
          <p className="text-muted small mb-0">
            השוואה ישירה בין מחיר הוסטלי המבוקש, מחיר Beds24 והמחיר הנמצא בפועל באתרים ברשת
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
              style={{ fontSize: '0.82rem', borderRadius: '6px' }}
            >
              הגדרת קישורי נכס
            </button>
          )}

          <button
            type="button"
            onClick={onRescanAll}
            disabled={isScanning}
            className="hostly-btn hostly-btn-primary btn-sm d-flex align-items-center gap-1.5"
            style={{ fontSize: '0.85rem', padding: '6px 14px' }}
            data-testid="rescan-all-btn"
          >
            <RefreshCw size={14} className={isScanning ? 'spin' : ''} />
            <span>{isScanning ? 'סורק אתרים ברשת…' : 'סרוק את כל האתרים מחדש'}</span>
          </button>
        </div>
      </div>

      {/* Summary Status Bar */}
      <div
        className="px-3 px-md-4 py-2 d-flex flex-wrap align-items-center justify-content-between gap-2"
        style={{
          background: discrepanciesCount > 0 ? '#fffbeb' : '#f0fdf4',
          borderBottom: '1px solid var(--hborder-light)',
          fontSize: '0.85rem',
        }}
      >
        <div className="d-flex align-items-center gap-3">
          <span className="fw-semibold" style={{ color: 'var(--htxt-1)' }}>
            סטטוס סנכרון מחירים:
          </span>
          <span className="d-flex align-items-center gap-1" style={{ color: '#047857' }}>
            <CheckCircle2 size={15} />
            <strong>{matchesCount}</strong> ערוצים תואמים
          </span>
          {discrepanciesCount > 0 && (
            <span className="d-flex align-items-center gap-1" style={{ color: '#b45309' }}>
              <AlertTriangle size={15} />
              <strong>{discrepanciesCount}</strong> ערוצים עם פער במחיר
            </span>
          )}
        </div>

        <div className="text-muted small">
          בסיס חישוב ללילה בהוסטלי: {formatCurrency(nights > 0 ? basePrice / nights : basePrice)}
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table
          className="table table-hover align-middle mb-0"
          data-testid="price-comparison-table"
          style={{ minWidth: '760px' }}
        >
          <thead>
            <tr style={{ background: 'var(--hsurf-2)', borderBottom: '1px solid var(--hborder)' }}>
              <th scope="col" style={{ color: 'var(--htxt-2)', fontWeight: 600, fontSize: '0.85rem', padding: '12px 16px' }}>
                ערוץ הזמנה
              </th>
              <th scope="col" style={{ color: 'var(--htxt-2)', fontWeight: 600, fontSize: '0.85rem', padding: '12px 16px' }}>
                מחיר הוסטלי (מבוקש)
              </th>
              <th scope="col" style={{ color: 'var(--htxt-2)', fontWeight: 600, fontSize: '0.85rem', padding: '12px 16px' }}>
                מחיר Beds24
              </th>
              <th scope="col" style={{ color: 'var(--htxt-2)', fontWeight: 600, fontSize: '0.85rem', padding: '12px 16px' }}>
                מחיר באתרים (אונליין)
              </th>
              <th scope="col" style={{ color: 'var(--htxt-2)', fontWeight: 600, fontSize: '0.85rem', padding: '12px 16px' }}>
                סטטוס התאמה
              </th>
              <th scope="col" style={{ color: 'var(--htxt-2)', fontWeight: 600, fontSize: '0.85rem', padding: '12px 16px', textAlign: 'center' }}>
                גלישה ישירה
              </th>
            </tr>
          </thead>
          <tbody>
            {channels.map((channel) => {
              const logo = getChannelLogo(channel.channelKey)
              const perNightHostly = nights > 0 ? channel.hostlyPrice / nights : channel.hostlyPrice
              const perNightBeds24 = nights > 0 ? channel.beds24Price / nights : channel.beds24Price
              const perNightOnline = channel.onlinePrice && nights > 0 ? channel.onlinePrice / nights : channel.onlinePrice

              return (
                <tr
                  key={channel.channelKey}
                  data-testid={`table-row-${channel.channelKey}`}
                  style={{ borderBottom: '1px solid var(--hborder-light)' }}
                >
                  {/* Channel Info */}
                  <td style={{ padding: '14px 16px' }}>
                    <div className="d-flex align-items-center gap-2.5">
                      {logo ? (
                        <img
                          src={logo}
                          alt={channel.name}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <div
                          className="d-flex align-items-center justify-content-center rounded-circle"
                          style={{
                            width: '28px',
                            height: '28px',
                            background: 'var(--hb-100)',
                            color: 'var(--hb)',
                          }}
                        >
                          <Globe size={16} />
                        </div>
                      )}
                      <div>
                        <div className="fw-bold" style={{ color: 'var(--htxt-1)', fontSize: '0.95rem' }}>
                          {channel.name}
                        </div>
                        <span
                          className="badge"
                          style={{
                            background: channel.channelKey !== 'direct' ? 'var(--hb-100)' : '#f3f4f6',
                            color: channel.channelKey !== 'direct' ? 'var(--hb)' : 'var(--htxt-2)',
                            fontSize: '0.72rem',
                            padding: '2px 6px',
                          }}
                        >
                          {channel.channelKey !== 'direct' ? 'מכפיל 1.21 (+21%)' : 'בסיס ללא עמלה'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Hostly Price */}
                  <td style={{ padding: '14px 16px' }} data-testid={`hostly-price-${channel.channelKey}`}>
                    <div className="fw-bold" style={{ fontSize: '1.05rem', color: 'var(--htxt-1)' }}>
                      {formatCurrency(channel.hostlyPrice)}
                    </div>
                    <div className="text-muted small" style={{ fontSize: '0.78rem' }}>
                      {formatCurrency(perNightHostly)} / לילה
                    </div>
                  </td>

                  {/* Beds24 Price */}
                  <td style={{ padding: '14px 16px' }} data-testid={`beds24-price-${channel.channelKey}`}>
                    <div className="fw-bold" style={{ fontSize: '1.05rem', color: 'var(--htxt-1)' }}>
                      {formatCurrency(channel.beds24Price)}
                    </div>
                    <div className="text-muted small" style={{ fontSize: '0.78rem' }}>
                      {formatCurrency(perNightBeds24)} / לילה
                    </div>
                  </td>

                  {/* Online Scraped Price */}
                  <td style={{ padding: '14px 16px' }} data-testid={`online-price-${channel.channelKey}`}>
                    {isScanning ? (
                      <span className="text-muted small d-inline-flex align-items-center gap-1">
                        <RefreshCw size={13} className="spin" />
                        בודק מחיר…
                      </span>
                    ) : channel.onlinePrice !== null ? (
                      <div>
                        <div className="fw-bold" style={{ fontSize: '1.05rem', color: 'var(--hb)' }}>
                          {formatCurrency(channel.onlinePrice)}
                        </div>
                        {perNightOnline && (
                          <div className="text-muted small" style={{ fontSize: '0.78rem' }}>
                            {formatCurrency(perNightOnline)} / לילה
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted small">
                        {channel.status === 'bot_protected'
                          ? 'מוגן בוטים'
                          : channel.status === 'no_url'
                          ? 'חסר קישור'
                          : 'לא זוהה'}
                      </span>
                    )}
                  </td>

                  {/* Match Status */}
                  <td style={{ padding: '14px 16px' }}>
                    {renderStatusBadge(channel)}
                  </td>

                  {/* Direct Navigation */}
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div className="d-flex align-items-center justify-content-center gap-1.5">
                      {channel.url ? (
                        <a
                          href={channel.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                          style={{
                            fontSize: '0.8rem',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            whiteSpace: 'nowrap',
                          }}
                          data-testid={`direct-link-${channel.channelKey}`}
                          title="גלוש לאתר עם תאריכים ומספר אורחים"
                        >
                          <span>גלוש לאתר</span>
                          <ExternalLink size={13} />
                        </a>
                      ) : (
                        <span className="text-muted small">אין קישור</span>
                      )}

                      <button
                        type="button"
                        onClick={() => onRescanChannel(channel.channelKey)}
                        disabled={isScanning || !channel.url}
                        className="btn btn-sm btn-light p-1"
                        title="סרוק ערוץ זה מחדש"
                        style={{ borderRadius: '6px', color: 'var(--htxt-2)' }}
                      >
                        <RefreshCw size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div
        className="p-3 bg-light text-muted small d-flex flex-wrap align-items-center justify-content-between gap-2"
        style={{ borderTop: '1px solid var(--hborder-light)', fontSize: '0.8rem' }}
      >
        <div className="d-flex align-items-center gap-1.5">
          <Search size={14} style={{ color: 'var(--hb)' }} />
          <span>
            הסורק מושך את המחיר המוצג לאורחים באתרים אונליין לפי התאריכים והרכב האורחים שנבחרו.
          </span>
        </div>
        <div>
          מכפיל עמלות Airbnb: <strong>1.21</strong> (+21%) | Booking.com: <strong>1.21</strong> (+21%)
        </div>
      </div>
    </div>
  )
}
