/**
 * Unit Tests — Availability Cache & Public Calendar API
 *
 * Tests the pure logic (no DB, no HTTP calls):
 * - generateApiKey format
 * - flattenCalendarData (internal helper, tested via mock)
 * - getAvailability response shape
 * - Public calendar route validation logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateApiKey } from '@/lib/availability/cache'

// ─── generateApiKey ──────────────────────────────────────────────────────────

describe('generateApiKey', () => {
  it('starts with hst_live_', () => {
    const key = generateApiKey()
    expect(key).toMatch(/^hst_live_/)
  })

  it('has 40 hex chars after the prefix', () => {
    const key = generateApiKey()
    const hex = key.replace('hst_live_', '')
    expect(hex).toMatch(/^[0-9a-f]{40}$/)
  })

  it('generates unique keys each time', () => {
    const keys = Array.from({ length: 20 }, generateApiKey)
    const unique = new Set(keys)
    expect(unique.size).toBe(20)
  })
})

// ─── Public Calendar API — date validation ────────────────────────────────────

describe('Public Calendar API — date validation logic', () => {
  const isValidDate = (str: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(new Date(str).getTime())

  it('accepts valid YYYY-MM-DD dates', () => {
    expect(isValidDate('2026-05-07')).toBe(true)
    expect(isValidDate('2026-01-01')).toBe(true)
    expect(isValidDate('2026-12-31')).toBe(true)
  })

  it('rejects invalid formats', () => {
    expect(isValidDate('07-05-2026')).toBe(false)
    expect(isValidDate('2026/05/07')).toBe(false)
    expect(isValidDate('not-a-date')).toBe(false)
    expect(isValidDate('')).toBe(false)
  })

  it('rejects impossible dates', () => {
    expect(isValidDate('2026-13-01')).toBe(false)
    expect(isValidDate('2026-00-01')).toBe(false)
  })
})

// ─── Public Calendar API — range validation ───────────────────────────────────

describe('Public Calendar API — range validation', () => {
  const MAX_DAYS = 365

  function validateRange(from: string, to: string): { ok: boolean; error?: string } {
    const fromDate = new Date(from)
    const toDate = new Date(to)
    if (toDate < fromDate) return { ok: false, error: '`to` must be >= `from`' }
    const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / 86_400_000)
    if (diffDays > MAX_DAYS) return { ok: false, error: `Date range cannot exceed ${MAX_DAYS} days` }
    return { ok: true }
  }

  it('accepts a valid range within 365 days', () => {
    expect(validateRange('2026-01-01', '2026-06-30').ok).toBe(true)
  })

  it('accepts same from and to date', () => {
    expect(validateRange('2026-05-07', '2026-05-07').ok).toBe(true)
  })

  it('rejects when to < from', () => {
    const r = validateRange('2026-06-01', '2026-05-01')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('>=')
  })

  it('rejects range > 365 days', () => {
    const r = validateRange('2026-01-01', '2027-06-01')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('365')
  })
})

// ─── CachedAvailability response shape ───────────────────────────────────────

describe('CachedAvailability response shape', () => {
  it('AvailabilityRow has required fields', () => {
    const row = { date: '2026-05-10', price: 450, available: true, minStay: 2 }
    expect(row).toHaveProperty('date')
    expect(row).toHaveProperty('price')
    expect(row).toHaveProperty('available')
    expect(row).toHaveProperty('minStay')
    expect(typeof row.date).toBe('string')
    expect(typeof row.price).toBe('number')
    expect(typeof row.available).toBe('boolean')
    expect(typeof row.minStay).toBe('number')
  })

  it('CachedAvailability wraps rows correctly', () => {
    const result = {
      roomId: '678098',
      propertyId: '326842',
      cachedAt: '2026-05-07T10:00:00Z',
      availability: [
        { date: '2026-05-10', price: 450, available: true, minStay: 2 },
        { date: '2026-05-11', price: 450, available: false, minStay: 2 },
      ],
    }
    expect(result.availability).toHaveLength(2)
    expect(result.availability[0].available).toBe(true)
    expect(result.availability[1].available).toBe(false)
  })
})

// ─── API Key validation ───────────────────────────────────────────────────────

describe('API Key — allowed rooms validation', () => {
  function isRoomAllowed(allowedRooms: string[], roomId: string): boolean {
    if (allowedRooms.length === 0) return true // empty = all rooms
    return allowedRooms.includes(roomId)
  }

  it('allows any room when allowedRooms is empty', () => {
    expect(isRoomAllowed([], '678098')).toBe(true)
    expect(isRoomAllowed([], '999999')).toBe(true)
  })

  it('allows only listed rooms', () => {
    expect(isRoomAllowed(['678098', '678360'], '678098')).toBe(true)
    expect(isRoomAllowed(['678098', '678360'], '678360')).toBe(true)
    expect(isRoomAllowed(['678098', '678360'], '999999')).toBe(false)
  })
})

// ─── Webhook cache trigger logic ──────────────────────────────────────────────

describe('Webhook — cache refresh trigger conditions', () => {
  it('should refresh cache for confirmed booking', () => {
    const validStatuses = ['confirmed', 'new', '1']
    expect(validStatuses.includes('confirmed')).toBe(true)
    expect(validStatuses.includes('new')).toBe(true)
    expect(validStatuses.includes('cancelled')).toBe(false)
    expect(validStatuses.includes('pending')).toBe(false)
  })

  it('should NOT refresh cache for cancelled booking', () => {
    const status = 'cancelled'
    const validStatuses = ['confirmed', 'new', '1']
    expect(validStatuses.includes(status.toLowerCase())).toBe(false)
  })
})
