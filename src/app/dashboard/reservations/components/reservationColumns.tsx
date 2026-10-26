import React from 'react'
import type { ColumnDef } from '@/components/ui'
import { formatCurrency } from '@/lib/dashboard/utils'
import { calculateNights } from '@/lib/dashboard/reservationsList'
import type { Reservation } from '@/lib/dashboard/types'
import { NewReservationBadge, ReservationSourceBadge, ReservationStatusBadge } from './ReservationBadges'

function formatDate(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString('he-IL') : '—'
}

/**
 * בונה את עמודות הטבלה. מקבל פונקציה שמחליטה אם להציג תגית "חדש"
 * כדי לשמור את הקובץ נקי ממצב (state).
 */
export function buildReservationColumns(
  isUnseenNew: (r: Reservation) => boolean,
  onEditCleaning?: (r: Reservation) => void,
): ColumnDef<Reservation>[] {
  const columns: ColumnDef<Reservation>[] = [
    {
      header: 'מזהה',
      cell: (r) => <span style={{ fontSize: 12.5, color: 'var(--htxt-3)' }}>{r.id}</span>,
      hideOnMobile: true,
    },
    {
      header: 'שם אורח',
      cell: (r) => (
        <div className="d-flex align-items-center gap-2">
          <span style={{ fontWeight: 600 }}>{r.guestName || '—'}</span>
          {isUnseenNew(r) && <NewReservationBadge />}
        </div>
      ),
      minWidth: 140,
      // במובייל השם מוצג ככותרת הכרטיסייה (mobileTitle)
      hideOnMobile: true,
    },
    { header: 'כניסה', cell: (r) => formatDate(r.checkIn) },
    { header: 'יציאה', cell: (r) => formatDate(r.checkOut) },
    {
      header: 'לילות',
      cell: (r) => {
        const nights = calculateNights(r.checkIn, r.checkOut)
        return nights > 0 ? `${nights} לילות` : '—'
      },
      hideOnMobile: true,
    },
    {
      header: 'סכום',
      cell: (r) => <span style={{ fontWeight: 700, color: 'var(--hb)' }}>{formatCurrency(r.total)}</span>,
      align: 'end',
    },
    {
      header: 'עלות ניקיון',
      cell: (r) => (
        r.cleaningCost && r.cleaningCost > 0 ? (
          <span style={{ fontWeight: 600, color: 'var(--htxt-2)' }}>
            {formatCurrency(r.cleaningCost)}
          </span>
        ) : (
          <span style={{ color: 'var(--htxt-4)' }}>—</span>
        )
      ),
      align: 'end',
      hideOnMobile: true,
    },
    { header: 'מקור', cell: (r) => <ReservationSourceBadge source={r.source} /> },
    { header: 'סטטוס', cell: (r) => <ReservationStatusBadge status={r.status} /> },
  ]

  if (onEditCleaning) {
    columns.push({
      header: 'ניקיון',
      cell: (r) =>
        r.status === 'cancelled' ? (
          <span style={{ color: 'var(--htxt-4)' }}>—</span>
        ) : (
          <button
            type="button"
            className="hostly-btn hostly-btn-sm hostly-btn-ghost"
            data-testid="edit-cleaning-cost"
            onClick={(e) => {
              e.stopPropagation()
              onEditCleaning(r)
            }}
          >
            {r.cleaningCost && r.cleaningCost > 0 ? 'ערוך מנקה' : 'הוסף מנקה'}
          </button>
        ),
      align: 'end',
    })
  }

  return columns
}
