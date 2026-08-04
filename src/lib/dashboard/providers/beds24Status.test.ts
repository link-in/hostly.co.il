import { describe, it, expect } from 'vitest'
import { normalizeBeds24BookingStatus } from '@/lib/dashboard/providers/beds24'

describe('normalizeBeds24BookingStatus', () => {
  it.each([
    [1, 'confirmed'],
    [2, 'pending'],
    [3, 'request'],
    [5, 'request'],
    [0, 'cancelled'],
    [4, 'cancelled'],
  ] as const)('maps numeric status %s to %s', (input, expected) => {
    expect(normalizeBeds24BookingStatus(input)).toBe(expected)
  })

  it.each([
    ['confirmed', 'confirmed'],
    ['booked', 'confirmed'],
    ['new', 'pending'],
    ['request', 'request'],
    ['inquiry', 'request'],
    ['Request', 'request'],
    ['cancelled', 'cancelled'],
  ] as const)('maps string status "%s" to %s', (input, expected) => {
    expect(normalizeBeds24BookingStatus(input)).toBe(expected)
  })
})
