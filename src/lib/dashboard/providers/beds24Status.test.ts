import { describe, it, expect } from 'vitest'
import { normalizeBeds24BookingStatus } from '@/lib/dashboard/providers/beds24'

describe('normalizeBeds24BookingStatus', () => {
  it.each([
    [1, 'confirmed'],
    [2, 'confirmed'], // Beds24 "New" = real booking
    [3, 'request'],
    [5, 'cancelled'], // Inquiry/question — hidden, not a reservation request
    [0, 'cancelled'],
    [4, 'cancelled'],
  ] as const)('maps numeric status %s to %s', (input, expected) => {
    expect(normalizeBeds24BookingStatus(input)).toBe(expected)
  })

  it.each([
    ['1', 'confirmed'],
    ['2', 'confirmed'],
    ['3', 'request'],
    ['5', 'cancelled'],
    ['0', 'cancelled'],
  ] as const)('maps digit string "%s" to %s', (input, expected) => {
    expect(normalizeBeds24BookingStatus(input)).toBe(expected)
  })

  it.each([
    ['confirmed', 'confirmed'],
    ['booked', 'confirmed'],
    ['new', 'confirmed'],
    ['request', 'request'],
    ['inquiry', 'cancelled'],
    ['Request', 'request'],
    ['cancelled', 'cancelled'],
  ] as const)('maps string status "%s" to %s', (input, expected) => {
    expect(normalizeBeds24BookingStatus(input)).toBe(expected)
  })
})
