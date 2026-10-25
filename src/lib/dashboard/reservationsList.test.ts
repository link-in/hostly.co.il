import { describe, it, expect } from 'vitest'
import {
  calculateNights,
  calculateReservationStats,
  filterReservations,
  getCommissionRate,
  hasActiveFilters,
  sortReservations,
} from './reservationsList'
import { markNewReservations } from './viewedReservations'
import type { Reservation } from './types'

function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'R1',
    guestName: 'דנה כהן',
    checkIn: '2026-03-01',
    checkOut: '2026-03-04',
    nights: 3,
    total: 1000,
    status: 'confirmed',
    source: 'Booking.com',
    ...overrides,
  }
}

describe('calculateNights', () => {
  it('counts nights between check-in and check-out', () => {
    expect(calculateNights('2026-03-01', '2026-03-04')).toBe(3)
  })

  it('returns 0 for missing, invalid or reversed dates', () => {
    expect(calculateNights(undefined, '2026-03-04')).toBe(0)
    expect(calculateNights('nope', '2026-03-04')).toBe(0)
    expect(calculateNights('2026-03-04', '2026-03-01')).toBe(0)
  })
})

describe('getCommissionRate', () => {
  const rates = { booking: 0.15, airbnb: 0.16, direct: 0 }

  it('matches the rate by source, case-insensitively', () => {
    expect(getCommissionRate('Booking.com', rates)).toBe(0.15)
    expect(getCommissionRate('AIRBNB', rates)).toBe(0.16)
    expect(getCommissionRate('Direct', rates)).toBe(0)
  })

  it('returns 0 for unknown or missing sources', () => {
    expect(getCommissionRate('Expedia', rates)).toBe(0)
    expect(getCommissionRate(undefined, rates)).toBe(0)
  })
})

describe('filterReservations', () => {
  const list = [
    makeReservation({ id: 'A1', guestName: 'דנה כהן', source: 'Airbnb', status: 'confirmed' }),
    makeReservation({ id: 'B2', guestName: 'יוסי לוי', source: 'Booking.com', status: 'cancelled', email: 'yossi@x.com' }),
  ]
  const all = { search: '', status: 'all', source: 'all' }

  it('returns everything with no active filters', () => {
    expect(filterReservations(list, all)).toHaveLength(2)
  })

  it('searches by name, id and email', () => {
    expect(filterReservations(list, { ...all, search: 'יוסי' }).map((r) => r.id)).toEqual(['B2'])
    expect(filterReservations(list, { ...all, search: 'a1' }).map((r) => r.id)).toEqual(['A1'])
    expect(filterReservations(list, { ...all, search: 'YOSSI@' }).map((r) => r.id)).toEqual(['B2'])
  })

  it('filters by status and source', () => {
    expect(filterReservations(list, { ...all, status: 'cancelled' }).map((r) => r.id)).toEqual(['B2'])
    expect(filterReservations(list, { ...all, source: 'airbnb' }).map((r) => r.id)).toEqual(['A1'])
  })
})

describe('hasActiveFilters', () => {
  it('detects whether any filter is active', () => {
    expect(hasActiveFilters({ search: '', status: 'all', source: 'all' })).toBe(false)
    expect(hasActiveFilters({ search: '  ', status: 'all', source: 'all' })).toBe(false)
    expect(hasActiveFilters({ search: 'x', status: 'all', source: 'all' })).toBe(true)
    expect(hasActiveFilters({ search: '', status: 'pending', source: 'all' })).toBe(true)
  })
})

describe('sortReservations', () => {
  const list = [
    makeReservation({ id: '1', checkIn: '2026-03-10', total: 500 }),
    makeReservation({ id: '2', checkIn: '2026-01-05', total: 1500 }),
    makeReservation({ id: '3', checkIn: '2026-02-20', total: 900 }),
  ]

  it('sorts by check-in in both directions', () => {
    expect(sortReservations(list, 'checkIn', 'asc').map((r) => r.id)).toEqual(['2', '3', '1'])
    expect(sortReservations(list, 'checkIn', 'desc').map((r) => r.id)).toEqual(['1', '3', '2'])
  })

  it('sorts by total', () => {
    expect(sortReservations(list, 'total', 'desc').map((r) => r.id)).toEqual(['2', '3', '1'])
  })

  it('does not mutate the input array', () => {
    const snapshot = list.map((r) => r.id)
    sortReservations(list, 'total', 'asc')
    expect(list.map((r) => r.id)).toEqual(snapshot)
  })
})

describe('calculateReservationStats', () => {
  it('aggregates revenue, commission, nights and averages', () => {
    const stats = calculateReservationStats(
      [
        makeReservation({ total: 1000, source: 'Booking.com', checkIn: '2026-03-01', checkOut: '2026-03-04' }),
        makeReservation({ id: 'R2', total: 500, source: 'Direct', checkIn: '2026-04-01', checkOut: '2026-04-03' }),
      ],
      { booking: 0.15, airbnb: 0.16, direct: 0 },
    )

    expect(stats.totalReservations).toBe(2)
    expect(stats.totalNights).toBe(5)
    expect(stats.totalRevenue).toBe(1500)
    expect(stats.totalCommission).toBe(150)
    expect(stats.totalCleaningCost).toBe(0)
    expect(stats.netRevenue).toBe(1350)
    expect(stats.avgNightlyRate).toBe(300)
    expect(stats.avgBookingValue).toBe(750)
  })

  it('deducts cleaning costs from net revenue', () => {
    const stats = calculateReservationStats(
      [
        makeReservation({ total: 1000, source: 'Booking.com', cleaningCost: 200, checkIn: '2026-03-01', checkOut: '2026-03-04' }),
        makeReservation({ id: 'R2', total: 800, source: 'Direct', cleaningCost: 150, checkIn: '2026-04-01', checkOut: '2026-04-03' }),
      ],
      { booking: 0.15, direct: 0 },
    )
    expect(stats.totalRevenue).toBe(1800)
    expect(stats.totalCommission).toBe(150)
    expect(stats.totalCleaningCost).toBe(350)
    expect(stats.netRevenue).toBe(1800 - 150 - 350) // 1300
  })

  it('returns zeros for an empty list', () => {
    const stats = calculateReservationStats([], { booking: 0.15 })
    expect(stats.totalCleaningCost).toBe(0)
    expect(stats.avgNightlyRate).toBe(0)
    expect(stats.avgBookingValue).toBe(0)
    expect(stats.netRevenue).toBe(0)
  })
})

describe('markNewReservations', () => {
  const now = new Date('2026-03-10T12:00:00Z')

  it('marks reservations created within the last 3 days as new', () => {
    const result = markNewReservations(
      [
        makeReservation({ id: 'recent', createdAt: '2026-03-09T10:00:00Z' }),
        makeReservation({ id: 'old', createdAt: '2026-03-01T10:00:00Z' }),
      ],
      new Set(),
      now,
    )
    expect(result.find((r) => r.id === 'recent')?.isNew).toBe(true)
    expect(result.find((r) => r.id === 'old')?.isNew).toBeUndefined()
  })

  it('skips reservations that were already viewed', () => {
    const result = markNewReservations(
      [makeReservation({ id: 'seen', createdAt: '2026-03-09T10:00:00Z' })],
      new Set(['seen']),
      now,
    )
    expect(result[0].isNew).toBeUndefined()
  })
})
