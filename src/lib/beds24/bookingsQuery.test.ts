import { describe, it, expect } from 'vitest'
import { buildBookingsListUrl } from './bookingsQuery'
import { CALENDAR_BOOKING_STATUSES } from '@/lib/dashboard/reservationStatus'

describe('buildBookingsListUrl', () => {
  it('requests confirmed, new, request and inquiry by default', () => {
    const url = buildBookingsListUrl('https://beds24.com/api/v2', {
      propertyId: '306559',
      roomId: '638851',
    })

    expect(url.pathname).toBe('/api/v2/bookings')
    expect(url.searchParams.get('propertyId')).toBe('306559')
    expect(url.searchParams.get('roomId')).toBe('638851')
    expect(url.searchParams.get('arrivalFrom')).toBe('2024-01-01')
    expect(url.searchParams.get('includeInvoice')).toBe('true')
    expect(url.searchParams.get('status')).toBe(CALENDAR_BOOKING_STATUSES)
  })

  it('omits roomId when not provided', () => {
    const url = buildBookingsListUrl('https://beds24.com/api/v2/', { propertyId: '1' })
    expect(url.searchParams.has('roomId')).toBe(false)
  })

  it('does not override an explicit status from extraQuery', () => {
    const url = buildBookingsListUrl('https://beds24.com/api/v2', {
      propertyId: '1',
      extraQuery: 'arrivalFrom=2025-01-01&status=confirmed',
    })

    expect(url.searchParams.get('status')).toBe('confirmed')
    expect(url.searchParams.get('arrivalFrom')).toBe('2025-01-01')
  })

  it('adds request+inquiry status when extraQuery has no status', () => {
    const url = buildBookingsListUrl('https://beds24.com/api/v2', {
      propertyId: '1',
      extraQuery: 'arrivalFrom=2025-06-01',
    })

    expect(url.searchParams.get('status')).toBe(CALENDAR_BOOKING_STATUSES)
  })
})
