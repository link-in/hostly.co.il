/**
 * Pure helpers for turning a list of reservations into the calendar's
 * "booked" state and the visual overlay bars (`bookingSegments`) used by
 * `CalendarPricing.tsx`. Extracted so this logic can be unit tested without
 * mounting the React component.
 */
import type { Reservation } from '@/lib/dashboard/types'
import { normalizeDate, toKey, isSameDay, addDays } from '@/lib/dashboard/calendarDates'

/**
 * Map of date-key -> reservations that occupy that *full* day.
 * The check-out day itself is intentionally excluded (a guest checking out
 * on day X frees up day X for a new check-in), so this map only reflects
 * whole-day occupancy for click/selection logic.
 */
export const buildBookingMap = (reservations: Reservation[]) => {
  const booked = new Map<string, Reservation[]>()

  reservations.forEach((reservation) => {
    if (!reservation.checkIn || !reservation.checkOut) {
      return
    }

    const checkIn = normalizeDate(new Date(reservation.checkIn))
    const checkOut = normalizeDate(new Date(reservation.checkOut))

    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      return
    }

    let cursor = checkIn
    while (cursor < checkOut) {
      const key = toKey(cursor)
      const list = booked.get(key) ?? []
      list.push(reservation)
      booked.set(key, list)
      cursor = addDays(cursor, 1)
    }
  })

  return booked
}

export const isBookedOn = (bookingMap: Map<string, Reservation[]>, date: Date) => {
  const key = toKey(date)
  return bookingMap.has(key)
}

export type BookingSegment = {
  id: string
  reservationId: string
  row: number
  /** Half-day column unit (0-13 within a 7-day week: col*2 = AM half, col*2+1 = PM half). */
  startCol: number
  /** Half-day column unit, inclusive. */
  endCol: number
  label: string
  status: Reservation['status']
}

/**
 * Builds the overlay bars drawn on top of the calendar grid to represent
 * each reservation's stay.
 *
 * Each day is split into two half-day units (AM / PM) so that turnover days
 * render correctly: the check-in day only occupies its PM half (the guest
 * arrives midday) and the check-out day only occupies its AM half (the guest
 * leaves in the morning), leaving the other half free to visually overlap
 * with an adjoining reservation on the same calendar cell.
 */
export const buildBookingSegments = (reservations: Reservation[], days: Date[]): BookingSegment[] => {
  const indexMap = new Map<string, number>()
  days.forEach((date, index) => {
    indexMap.set(toKey(date), index)
  })

  const segments = new Map<string, BookingSegment>()

  reservations.forEach((reservation) => {
    if (!reservation.checkIn || !reservation.checkOut) {
      return
    }

    const checkIn = normalizeDate(new Date(reservation.checkIn))
    const checkOut = normalizeDate(new Date(reservation.checkOut))
    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) || checkOut <= checkIn) {
      return
    }

    let cursor = checkIn
    while (cursor <= checkOut) {
      const key = toKey(cursor)
      const index = indexMap.get(key)
      if (index !== undefined) {
        const row = Math.floor(index / 7)
        const col = index % 7
        const isCheckInDay = isSameDay(cursor, checkIn)
        const isCheckOutDay = isSameDay(cursor, checkOut)

        // AM half unit = col * 2, PM half unit = col * 2 + 1
        const startUnit = col * 2 + (isCheckInDay ? 1 : 0)
        const endUnit = col * 2 + (isCheckOutDay ? 0 : 1)

        const segmentKey = `${reservation.id}-${row}`
        const existing = segments.get(segmentKey)
        if (existing) {
          existing.startCol = Math.min(existing.startCol, startUnit)
          existing.endCol = Math.max(existing.endCol, endUnit)
        } else {
          segments.set(segmentKey, {
            id: segmentKey,
            reservationId: reservation.id,
            row,
            startCol: startUnit,
            endCol: endUnit,
            label: reservation.guestName,
            status: reservation.status,
          })
        }
      }
      cursor = addDays(cursor, 1)
    }
  })

  return Array.from(segments.values())
}
