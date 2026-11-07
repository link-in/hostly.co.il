/**
 * מעקב אחר הזמנות "חדשות" שהמשתמש כבר ראה (נשמר ב-localStorage).
 */

import type { Reservation } from './types'

const VIEWED_RESERVATIONS_KEY = 'hostly_viewed_reservations'
const NEW_RESERVATION_WINDOW_DAYS = 3

export function getViewedReservations(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem(VIEWED_RESERVATIONS_KEY)
    return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>()
  } catch {
    return new Set<string>()
  }
}

export function markReservationAsViewed(reservationId: string): void {
  if (typeof window === 'undefined') return
  try {
    const viewed = getViewedReservations()
    viewed.add(reservationId)
    localStorage.setItem(VIEWED_RESERVATIONS_KEY, JSON.stringify([...viewed]))
  } catch (error) {
    console.error('Failed to mark reservation as viewed:', error)
  }
}

function isCreatedWithinWindow(createdAt: string | undefined, now: Date): boolean {
  if (!createdAt) return false
  const created = new Date(createdAt)
  if (Number.isNaN(created.getTime())) return false
  const threshold = new Date(now)
  threshold.setDate(threshold.getDate() - NEW_RESERVATION_WINDOW_DAYS)
  return created >= threshold
}

/** מסמן הזמנות שנוצרו ב-3 הימים האחרונים כ"חדשות" (אלא אם כבר נצפו). */
export function markNewReservations(
  reservations: Reservation[],
  viewedIds: Set<string> = getViewedReservations(),
  now: Date = new Date(),
): Reservation[] {
  return reservations.map((reservation) => {
    if (viewedIds.has(reservation.id) || reservation.isNew) return reservation
    return isCreatedWithinWindow(reservation.createdAt, now) ? { ...reservation, isNew: true } : reservation
  })
}
