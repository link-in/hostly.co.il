import { describe, it, expect } from 'vitest'
import {
  extractInvoiceTotal,
  parseBookingSource,
  extractBookingId,
  normalizeBookingItem,
  isConfirmedBookingStatus,
  extractUserTokens,
} from './normalizer'

// ─── extractInvoiceTotal ──────────────────────────────────────────────────────

describe('extractInvoiceTotal', () => {
  it('sums numeric amount fields', () => {
    expect(extractInvoiceTotal([{ amount: 100 }, { amount: 50 }])).toBe(150)
  })

  it('sums string amount fields', () => {
    expect(extractInvoiceTotal([{ amount: '100.50' }, { amount: '49.50' }])).toBe(150)
  })

  it('falls back to total field when amount is absent', () => {
    expect(extractInvoiceTotal([{ total: 200 }])).toBe(200)
  })

  it('ignores non-finite values', () => {
    expect(extractInvoiceTotal([{ amount: NaN }, { amount: 50 }])).toBe(50)
  })

  it('returns 0 for empty array', () => {
    expect(extractInvoiceTotal([])).toBe(0)
  })

  it('ignores non-object entries', () => {
    expect(extractInvoiceTotal([null, undefined, 'bad', { amount: 30 }])).toBe(30)
  })
})

// ─── parseBookingSource ───────────────────────────────────────────────────────

describe('parseBookingSource', () => {
  it.each([
    ['Airbnb',        'airbnb'],
    ['AIRBNB',        'airbnb'],
    ['airbnb.com',    'airbnb'],
    ['Booking',       'booking.com'],
    ['booking.com',   'booking.com'],
    ['Direct',        'other'],
    ['',              'other'],
    [undefined,       'other'],
    [null,            'other'],
  ] as const)('"%s" → "%s"', (input, expected) => {
    expect(parseBookingSource(input)).toBe(expected)
  })
})

// ─── extractBookingId ─────────────────────────────────────────────────────────

describe('extractBookingId', () => {
  it('extracts from new.id format', () => {
    expect(extractBookingId([{ new: { id: 12345 } }])).toBe('12345')
  })

  it('extracts from bookingId format', () => {
    expect(extractBookingId([{ bookingId: 99 }])).toBe('99')
  })

  it('returns N/A for unknown format', () => {
    expect(extractBookingId({})).toBe('N/A')
    expect(extractBookingId([])).toBe('N/A')
    expect(extractBookingId(null)).toBe('N/A')
  })
})

// ─── isConfirmedBookingStatus ─────────────────────────────────────────────────

describe('isConfirmedBookingStatus', () => {
  it.each(['confirmed', 'new', '1', 'CONFIRMED'])('accepts "%s"', (status) => {
    expect(isConfirmedBookingStatus(status)).toBe(true)
  })

  it.each(['cancelled', 'pending', 'rejected', '0'])('rejects "%s"', (status) => {
    expect(isConfirmedBookingStatus(status)).toBe(false)
  })
})

// ─── normalizeBookingItem ─────────────────────────────────────────────────────

describe('normalizeBookingItem', () => {
  const base = {
    arrival: '2026-06-01',
    departure: '2026-06-05',
    firstName: 'Yossi',
    lastName: 'Cohen',
    price: 500,
  }

  it('sets propertyId and roomId as numbers', () => {
    const result = normalizeBookingItem(base, '111', '222')
    expect(result.propertyId).toBe(111)
    expect(result.roomId).toBe(222)
  })

  it('uses status "confirmed" by default', () => {
    const result = normalizeBookingItem(base, 1, 2)
    expect(result.status).toBe('confirmed')
  })

  it('uses invoice total when no explicit price', () => {
    const item = { ...base, price: 0, invoice: [{ amount: 300 }, { amount: 200 }] }
    const result = normalizeBookingItem(item, 1, 2)
    expect(result.price).toBe(500)
  })

  it('includes optional fields when present', () => {
    const item = { ...base, mobile: '0521234567', email: 'test@test.com', notes: 'late checkin' }
    const result = normalizeBookingItem(item, 1, 2)
    expect(result.mobile).toBe('0521234567')
    expect(result.email).toBe('test@test.com')
    expect(result.notes).toBe('late checkin')
  })

  it('includes notes even when empty string', () => {
    const item = { ...base, notes: '' }
    const result = normalizeBookingItem(item, 1, 2)
    expect(result.notes).toBe('')
  })

  it('omits optional fields that are absent', () => {
    const result = normalizeBookingItem(base, 1, 2)
    expect(result.mobile).toBeUndefined()
    expect(result.email).toBeUndefined()
    expect(result.notes).toBeUndefined()
  })
})

// ─── extractUserTokens ────────────────────────────────────────────────────────

describe('extractUserTokens', () => {
  it('returns tokens when both present', () => {
    const session = { user: { beds24Token: 'acc', beds24RefreshToken: 'ref' } }
    expect(extractUserTokens(session)).toEqual({ accessToken: 'acc', refreshToken: 'ref' })
  })

  it('returns undefined when token missing', () => {
    expect(extractUserTokens({ user: { beds24Token: 'acc' } })).toBeUndefined()
    expect(extractUserTokens(null)).toBeUndefined()
  })
})
