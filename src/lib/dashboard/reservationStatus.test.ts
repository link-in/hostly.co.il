import { describe, it, expect } from 'vitest'
import {
  CALENDAR_BOOKING_STATUS_LIST,
  isAwaitingApprovalStatus,
  occupiesCalendarNight,
  countsTowardRevenue,
  canConfirmViaBeds24Api,
} from './reservationStatus'

describe('isAwaitingApprovalStatus', () => {
  it.each(['request', 'inquiry'] as const)('is true for %s', (status) => {
    expect(isAwaitingApprovalStatus(status)).toBe(true)
  })

  it.each(['confirmed', 'pending', 'cancelled'] as const)('is false for %s', (status) => {
    expect(isAwaitingApprovalStatus(status)).toBe(false)
  })
})

describe('occupiesCalendarNight', () => {
  it.each(['confirmed', 'pending', 'request'] as const)('occupies for %s', (status) => {
    expect(occupiesCalendarNight(status)).toBe(true)
  })

  it('does not occupy nights for an inquiry (Beds24 does not block the room)', () => {
    expect(occupiesCalendarNight('inquiry')).toBe(false)
  })

  it('does not occupy nights for cancelled', () => {
    expect(occupiesCalendarNight('cancelled')).toBe(false)
  })
})

describe('countsTowardRevenue', () => {
  it.each(['confirmed', 'pending'] as const)('counts %s', (status) => {
    expect(countsTowardRevenue(status)).toBe(true)
  })

  it.each(['request', 'inquiry', 'cancelled'] as const)('excludes %s', (status) => {
    expect(countsTowardRevenue(status)).toBe(false)
  })
})

describe('canConfirmViaBeds24Api', () => {
  it('allows confirming a Beds24 request via POST /bookings', () => {
    expect(canConfirmViaBeds24Api('request')).toBe(true)
  })

  it('does not allow confirming an Airbnb inquiry via Beds24', () => {
    expect(canConfirmViaBeds24Api('inquiry')).toBe(false)
  })
})

describe('CALENDAR_BOOKING_STATUS_LIST', () => {
  it('includes confirmed, new, request and inquiry', () => {
    expect([...CALENDAR_BOOKING_STATUS_LIST].sort()).toEqual(
      ['confirmed', 'inquiry', 'new', 'request'].sort(),
    )
  })
})
