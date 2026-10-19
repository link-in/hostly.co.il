import React from 'react'
import { ArrowDown, ArrowUp, Banknote, Calendar, RotateCcw } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import type { ReservationFilters, ReservationSortField, SortDirection } from '@/lib/dashboard/reservationsList'

interface ReservationsFiltersProps {
  filters: ReservationFilters
  onChange: (next: ReservationFilters) => void
  onReset: () => void
  canReset: boolean
  sortField: ReservationSortField
  sortDirection: SortDirection
  onSortChange: (field: ReservationSortField) => void
  visibleCount: number
  totalCount: number
}

const SORT_OPTIONS: { field: ReservationSortField; label: string; icon: React.ReactNode }[] = [
  { field: 'checkIn', label: 'תאריך', icon: <Calendar size={14} /> },
  { field: 'total', label: 'סכום', icon: <Banknote size={14} /> },
]

const labelStyle: React.CSSProperties = {
  color: 'var(--htxt-2)',
  fontSize: 12.5,
  fontWeight: 600,
}

export default function ReservationsFilters({
  filters,
  onChange,
  onReset,
  canReset,
  sortField,
  sortDirection,
  onSortChange,
  visibleCount,
  totalCount,
}: ReservationsFiltersProps) {
  const patch = (partial: Partial<ReservationFilters>) => onChange({ ...filters, ...partial })

  return (
    <Card padded className="mb-3 hostly-dark-card">
      <div className="row g-3 align-items-end">
        <div className="col-12 col-md-4">
          <label className="form-label mb-1" style={labelStyle} htmlFor="reservations-search">
            חיפוש
          </label>
          <input
            id="reservations-search"
            type="text"
            className="form-control"
            placeholder="שם, מזהה הזמנה, אימייל או טלפון"
            value={filters.search}
            onChange={(e) => patch({ search: e.target.value })}
          />
        </div>

        <div className="col-6 col-md-3">
          <label className="form-label mb-1" style={labelStyle} htmlFor="reservations-status">
            סטטוס
          </label>
          <select
            id="reservations-status"
            className="form-select"
            value={filters.status}
            onChange={(e) => patch({ status: e.target.value })}
          >
            <option value="all">כל הסטטוסים</option>
            <option value="confirmed">מאושר</option>
            <option value="request">בקשת הזמנה</option>
            <option value="inquiry">בירור</option>
            <option value="pending">ממתין</option>
            <option value="cancelled">בוטל</option>
          </select>
        </div>

        <div className="col-6 col-md-3">
          <label className="form-label mb-1" style={labelStyle} htmlFor="reservations-source">
            מקור
          </label>
          <select
            id="reservations-source"
            className="form-select"
            value={filters.source}
            onChange={(e) => patch({ source: e.target.value })}
          >
            <option value="all">כל המקורות</option>
            <option value="booking">Booking.com</option>
            <option value="airbnb">Airbnb</option>
            <option value="direct">ישירה</option>
          </select>
        </div>

        <div className="col-12 col-md-2">
          <Button
            variant="ghost"
            size="md"
            className="w-100"
            disabled={!canReset}
            iconStart={<RotateCcw size={14} />}
            onClick={onReset}
          >
            איפוס
          </Button>
        </div>
      </div>

      <div
        className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3 pt-3"
        style={{ borderTop: '1px solid var(--hborder-light)' }}
      >
        <div style={{ color: 'var(--htxt-3)', fontSize: 13 }}>
          מציג {visibleCount} מתוך {totalCount} הזמנות
        </div>

        <div className="d-flex gap-2">
          {SORT_OPTIONS.map(({ field, label, icon }) => {
            const active = sortField === field
            return (
              <Button
                key={field}
                size="sm"
                variant={active ? 'primary' : 'ghost'}
                iconStart={icon}
                iconEnd={active ? (sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : undefined}
                onClick={() => onSortChange(field)}
              >
                {label}
              </Button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
