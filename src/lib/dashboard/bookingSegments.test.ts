import { describe, it, expect } from 'vitest'
import { buildBookingMap, isBookedOn, buildBookingSegments } from './bookingSegments'
import type { Reservation } from '@/lib/dashboard/types'

const makeReservation = (overrides: Partial<Reservation> & Pick<Reservation, 'id' | 'checkIn' | 'checkOut'>): Reservation => ({
  guestName: 'Guest',
  nights: 1,
  total: 0,
  status: 'confirmed',
  ...overrides,
})

// A simple 4-day window (28th - 31st), one per grid column, so tests don't
// need to worry about actual weekday layout.
const days = [
  new Date(2026, 6, 28),
  new Date(2026, 6, 29),
  new Date(2026, 6, 30),
  new Date(2026, 6, 31),
]

// ─── buildBookingMap ───────────────────────────────────────────────────────

describe('buildBookingMap', () => {
  it('marks every night from check-in up to (but excluding) check-out', () => {
    const reservation = makeReservation({ id: 'r1', checkIn: '2026-07-28', checkOut: '2026-07-30' })
    const map = buildBookingMap([reservation])

    expect(map.has('2026-07-28')).toBe(true)
    expect(map.has('2026-07-29')).toBe(true)
    expect(map.has('2026-07-30')).toBe(false)
  })

  it('ignores reservations with missing or invalid dates', () => {
    const missing = makeReservation({ id: 'r1', checkIn: '', checkOut: '' })
    const invalid = makeReservation({ id: 'r2', checkIn: 'not-a-date', checkOut: '2026-07-30' })
    const map = buildBookingMap([missing, invalid])

    expect(map.size).toBe(0)
  })
})

describe('isBookedOn', () => {
  it('reflects whether the given date is present in the booking map', () => {
    const reservation = makeReservation({ id: 'r1', checkIn: '2026-07-28', checkOut: '2026-07-30' })
    const map = buildBookingMap([reservation])

    expect(isBookedOn(map, new Date(2026, 6, 28))).toBe(true)
    expect(isBookedOn(map, new Date(2026, 6, 30))).toBe(false)
  })
})

// ─── buildBookingSegments ──────────────────────────────────────────────────

describe('buildBookingSegments', () => {
  it('splits check-in and check-out days into half-day units, per the 28-30 example', () => {
    // Booking from the 28th to the 30th: half mark on the 28th (arrival, PM),
    // full day on the 29th, half mark on the 30th (departure, AM).
    const reservation = makeReservation({ id: 'r1', checkIn: '2026-07-28', checkOut: '2026-07-30' })
    const segments = buildBookingSegments([reservation], days)

    expect(segments).toHaveLength(1)
    const [segment] = segments
    expect(segment.row).toBe(0)
    // col 0 (28th) PM half = unit 1
    expect(segment.startCol).toBe(1)
    // col 2 (30th) AM half = unit 4
    expect(segment.endCol).toBe(4)
  })

  it('lets a same-day turnover render as two adjoining, non-overlapping half-day bars', () => {
    const outgoing = makeReservation({ id: 'out', checkIn: '2026-07-28', checkOut: '2026-07-30', guestName: 'Outgoing' })
    const incoming = makeReservation({ id: 'in', checkIn: '2026-07-30', checkOut: '2026-07-31', guestName: 'Incoming' })
    const segments = buildBookingSegments([outgoing, incoming], days)

    expect(segments).toHaveLength(2)
    const outgoingSegment = segments.find((s) => s.id.startsWith('out'))!
    const incomingSegment = segments.find((s) => s.id.startsWith('in'))!

    // Outgoing guest occupies up through the AM half of the 30th (unit 4)...
    expect(outgoingSegment.endCol).toBe(4)
    // ...and the incoming guest starts right after, at the PM half of the 30th (unit 5).
    expect(incomingSegment.startCol).toBe(5)
    expect(outgoingSegment.endCol).toBeLessThan(incomingSegment.startCol)
  })

  it('renders a one-night stay as just the two half-day units at the boundary', () => {
    const reservation = makeReservation({ id: 'r1', checkIn: '2026-07-28', checkOut: '2026-07-29' })
    const segments = buildBookingSegments([reservation], days)

    expect(segments).toHaveLength(1)
    expect(segments[0].startCol).toBe(1) // PM half of the 28th
    expect(segments[0].endCol).toBe(2) // AM half of the 29th
  })

  it('uses the guest name as the segment label', () => {
    const reservation = makeReservation({ id: 'r1', checkIn: '2026-07-28', checkOut: '2026-07-30', guestName: 'דנה כהן' })
    const segments = buildBookingSegments([reservation], days)

    expect(segments[0].label).toBe('דנה כהן')
  })

  it('ignores reservations with missing dates, invalid dates, or checkOut <= checkIn', () => {
    const missing = makeReservation({ id: 'r1', checkIn: '', checkOut: '' })
    const invalid = makeReservation({ id: 'r2', checkIn: 'nope', checkOut: '2026-07-30' })
    const backwards = makeReservation({ id: 'r3', checkIn: '2026-07-30', checkOut: '2026-07-28' })
    const sameDay = makeReservation({ id: 'r4', checkIn: '2026-07-28', checkOut: '2026-07-28' })

    const segments = buildBookingSegments([missing, invalid, backwards, sameDay], days)

    expect(segments).toHaveLength(0)
  })

  it('skips days that fall outside the visible calendar grid', () => {
    // Check-out lands one day past the last visible day; only the visible
    // portion of the stay should be represented.
    const reservation = makeReservation({ id: 'r1', checkIn: '2026-07-30', checkOut: '2026-08-01' })
    const segments = buildBookingSegments([reservation], days)

    expect(segments).toHaveLength(1)
    // col 2 (30th) PM half = unit 5, through col 3 (31st) which is a full day since
    // check-out (Aug 1st) is outside the visible grid = unit 7 (end of day 31st).
    expect(segments[0].startCol).toBe(5)
    expect(segments[0].endCol).toBe(7)
  })
})
