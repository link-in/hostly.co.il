/**
 * לוגיקה טהורה לעמוד "כל ההזמנות" — סינון, מיון וסטטיסטיקות.
 * אין כאן תלות ב-React או ב-DOM, כך שקל לבדוק אותה ביחידות.
 */

import type { Reservation } from './types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReservationSortField = 'checkIn' | 'total' | 'status'
export type SortDirection = 'asc' | 'desc'

export interface ReservationFilters {
  search: string
  /** 'all' או ערך סטטוס ספציפי */
  status: string
  /** 'all' או מקור (booking / airbnb / direct) */
  source: string
}

export interface CommissionRates {
  booking: number
  airbnb: number
  direct: number
}

export interface ReservationStats {
  totalReservations: number
  totalNights: number
  totalRevenue: number
  totalCommission: number
  totalCleaningCost: number
  netRevenue: number
  avgNightlyRate: number
  avgBookingValue: number
}

export const DEFAULT_COMMISSION_RATES: CommissionRates = {
  booking: 0.15,
  airbnb: 0.16,
  direct: 0,
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

// ─── Nights ───────────────────────────────────────────────────────────────────

/** מספר לילות בין כניסה ליציאה. מחזיר 0 כשהתאריכים חסרים או לא תקינים. */
export function calculateNights(checkIn?: string, checkOut?: string): number {
  if (!checkIn || !checkOut) return 0
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  if (Number.isNaN(diff)) return 0
  const nights = Math.round(diff / MS_PER_DAY)
  return nights > 0 ? nights : 0
}

// ─── Commission ───────────────────────────────────────────────────────────────

/** שיעור העמלה לפי מקור ההזמנה (booking / airbnb / direct). */
export function getCommissionRate(source: string | undefined, rates: Partial<CommissionRates>): number {
  const normalized = source?.toLowerCase() ?? ''
  if (normalized.includes('booking')) return rates.booking ?? 0
  if (normalized.includes('airbnb')) return rates.airbnb ?? 0
  if (normalized.includes('direct')) return rates.direct ?? 0
  return 0
}

// ─── Filter ───────────────────────────────────────────────────────────────────

function matchesSearch(reservation: Reservation, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return true
  return [reservation.guestName, reservation.id, reservation.email, reservation.phone].some((field) =>
    field?.toLowerCase().includes(query),
  )
}

function matchesStatus(reservation: Reservation, status: string): boolean {
  return status === 'all' || reservation.status === status
}

function matchesSource(reservation: Reservation, source: string): boolean {
  return source === 'all' || Boolean(reservation.source?.toLowerCase().includes(source.toLowerCase()))
}

export function filterReservations(reservations: Reservation[], filters: ReservationFilters): Reservation[] {
  return reservations.filter(
    (r) =>
      matchesSearch(r, filters.search) &&
      matchesStatus(r, filters.status) &&
      matchesSource(r, filters.source),
  )
}

/** האם יש פילטר פעיל (לצורך הצגת כפתור איפוס). */
export function hasActiveFilters(filters: ReservationFilters): boolean {
  return filters.search.trim() !== '' || filters.status !== 'all' || filters.source !== 'all'
}

// ─── Sort ─────────────────────────────────────────────────────────────────────

function compareBy(field: ReservationSortField, a: Reservation, b: Reservation): number {
  switch (field) {
    case 'checkIn':
      return new Date(a.checkIn || 0).getTime() - new Date(b.checkIn || 0).getTime()
    case 'total':
      return (a.total || 0) - (b.total || 0)
    case 'status':
      return (a.status || '').localeCompare(b.status || '')
  }
}

/** מיון ללא שינוי המערך המקורי. */
export function sortReservations(
  reservations: Reservation[],
  field: ReservationSortField,
  direction: SortDirection,
): Reservation[] {
  const sign = direction === 'asc' ? 1 : -1
  return [...reservations].sort((a, b) => sign * compareBy(field, a, b))
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function calculateReservationStats(
  reservations: Reservation[],
  rates: Partial<CommissionRates>,
): ReservationStats {
  let totalRevenue = 0
  let totalCommission = 0
  let totalCleaningCost = 0
  let totalNights = 0

  for (const reservation of reservations) {
    const total = reservation.total || 0
    totalRevenue += total
    totalCommission += total * getCommissionRate(reservation.source, rates)
    totalCleaningCost += reservation.cleaningCost || 0
    totalNights += calculateNights(reservation.checkIn, reservation.checkOut)
  }

  return {
    totalReservations: reservations.length,
    totalNights,
    totalRevenue,
    totalCommission,
    totalCleaningCost,
    netRevenue: totalRevenue - totalCommission - totalCleaningCost,
    avgNightlyRate: totalNights > 0 ? totalRevenue / totalNights : 0,
    avgBookingValue: reservations.length > 0 ? totalRevenue / reservations.length : 0,
  }
}
