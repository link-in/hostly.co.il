import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createFakeSupabaseClient, type FakeSupabaseClient } from '@/__tests__/helpers/fakeSupabase'

let fakeClient: FakeSupabaseClient

// vi.mock calls are hoisted above imports by Vitest, so `fakeClient` is
// referenced lazily inside the factory — it's only read once `blocking.ts`
// actually calls `createServiceRoleClient()` during a test, by which point
// `beforeEach` below has already assigned it.
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => fakeClient,
}))

import {
  expandDateRangeLocal,
  buildCacheRowsFromPayload,
  overlayAvailabilityCache,
  writeCacheAvailability,
} from './blocking'

beforeEach(() => {
  fakeClient = createFakeSupabaseClient({ availability_cache: [] })
})

// ─── expandDateRangeLocal ────────────────────────────────────────────────────
// Regression coverage for the off-by-one bug: parsing "2026-07-12" with
// `new Date(str)` treats it as UTC midnight, which rolls back to July 11
// once converted through `toISOString()` on a server running east of UTC.

describe('expandDateRangeLocal', () => {
  it('returns a single date for a same-day range, with no shift', () => {
    expect(expandDateRangeLocal('2026-07-12', '2026-07-12')).toEqual(['2026-07-12'])
  })

  it('expands a multi-day range inclusively', () => {
    expect(expandDateRangeLocal('2026-07-12', '2026-07-14')).toEqual([
      '2026-07-12',
      '2026-07-13',
      '2026-07-14',
    ])
  })

  it('handles ranges spanning a month boundary', () => {
    expect(expandDateRangeLocal('2026-07-30', '2026-08-02')).toEqual([
      '2026-07-30',
      '2026-07-31',
      '2026-08-01',
      '2026-08-02',
    ])
  })

  it('handles ranges spanning a year boundary', () => {
    expect(expandDateRangeLocal('2026-12-30', '2027-01-01')).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
    ])
  })
})

// ─── buildCacheRowsFromPayload ───────────────────────────────────────────────

describe('buildCacheRowsFromPayload', () => {
  const NOW = '2026-07-04T20:00:00.000Z'

  it('expands a blocked date range into one row per date', () => {
    const payload = [
      { roomId: 638851, propertyId: 306559, calendar: [{ from: '2026-07-12', to: '2026-07-13', numAvail: 0, price1: 600 }] },
    ]
    const byRoom = buildCacheRowsFromPayload(payload, 'user-1', undefined, undefined, NOW)
    expect(byRoom['638851']).toHaveLength(2)
    expect(byRoom['638851'][0]).toMatchObject({
      user_id: 'user-1',
      room_id: '638851',
      property_id: '306559',
      date: '2026-07-12',
      num_avail: 0,
      price: 600,
      min_stay: 1,
    })
    expect(byRoom['638851'][1].date).toBe('2026-07-13')
  })

  it('defaults price to 0 when price1 is absent (blocked with no price override)', () => {
    const payload = [{ roomId: 638851, calendar: [{ from: '2026-07-20', to: '2026-07-20', numAvail: 0 }] }]
    const byRoom = buildCacheRowsFromPayload(payload, 'user-1', undefined, undefined, NOW)
    expect(byRoom['638851'][0].price).toBe(0)
  })

  it('skips calendar entries with no numAvail (pure price/minStay updates)', () => {
    const payload = [{ roomId: 638851, calendar: [{ from: '2026-07-20', to: '2026-07-20', price1: 650 }] }]
    const byRoom = buildCacheRowsFromPayload(payload, 'user-1', undefined, undefined, NOW)
    expect(byRoom['638851'] ?? []).toHaveLength(0)
  })

  it('skips calendar entries with no from date', () => {
    const payload = [{ roomId: 638851, calendar: [{ numAvail: 0 }] }]
    const byRoom = buildCacheRowsFromPayload(payload, 'user-1', undefined, undefined, NOW)
    expect(byRoom['638851'] ?? []).toHaveLength(0)
  })

  it('falls back to defaultRoomId/propertyId when the payload item omits them', () => {
    const payload = [{ calendar: [{ from: '2026-07-12', to: '2026-07-12', numAvail: 1 }] }]
    const byRoom = buildCacheRowsFromPayload(payload, 'user-1', '638851', '306559', NOW)
    expect(byRoom['638851'][0]).toMatchObject({ room_id: '638851', property_id: '306559' })
  })

  it('groups rows separately per roomId across multiple payload items', () => {
    const payload = [
      { roomId: 1, calendar: [{ from: '2026-07-12', to: '2026-07-12', numAvail: 0 }] },
      { roomId: 2, calendar: [{ from: '2026-07-13', to: '2026-07-13', numAvail: 0 }] },
    ]
    const byRoom = buildCacheRowsFromPayload(payload, 'user-1', undefined, undefined, NOW)
    expect(Object.keys(byRoom).sort()).toEqual(['1', '2'])
  })
})

// ─── overlayAvailabilityCache ────────────────────────────────────────────────

describe('overlayAvailabilityCache', () => {
  const basePrices = [
    { date: '2026-07-11', price: 600, roomId: '638851', numAvail: 1 },
    { date: '2026-07-12', price: 600, roomId: '638851', numAvail: 1 },
  ]

  it('returns prices unchanged when userId is missing', async () => {
    const result = await overlayAvailabilityCache(basePrices, undefined, '638851')
    expect(result).toBe(basePrices)
  })

  it('returns prices unchanged when roomId is missing', async () => {
    const result = await overlayAvailabilityCache(basePrices, 'user-1', undefined)
    expect(result).toBe(basePrices)
  })

  it('returns prices unchanged when the cache has no rows for this room', async () => {
    const result = await overlayAvailabilityCache(basePrices, 'user-1', '638851')
    expect(result).toEqual(basePrices)
  })

  it('overlays a cached num_avail=0 onto a matching price entry', async () => {
    fakeClient = createFakeSupabaseClient({
      availability_cache: [
        { user_id: 'user-1', room_id: '638851', date: '2026-07-12', num_avail: 0 },
      ],
    })
    const result = await overlayAvailabilityCache(basePrices, 'user-1', '638851')
    const july12 = result.find((p) => p.date === '2026-07-12')
    expect(july12?.numAvail).toBe(0)
    const july11 = result.find((p) => p.date === '2026-07-11')
    expect(july11?.numAvail).toBe(1) // untouched
  })

  it('injects a synthetic blocked entry when Beds24 never returned a price for that date', async () => {
    // Regression: Beds24 GET never returns entries with no price override, so a
    // manually-blocked date with no price1 would otherwise vanish from the response.
    fakeClient = createFakeSupabaseClient({
      availability_cache: [
        { user_id: 'user-1', room_id: '638851', date: '2026-09-01', num_avail: 0 },
      ],
    })
    const result = await overlayAvailabilityCache(basePrices, 'user-1', '638851')
    const injected = result.find((p) => p.date === '2026-09-01')
    expect(injected).toMatchObject({ date: '2026-09-01', price: 0, numAvail: 0, roomId: '638851' })
  })

  it('does not inject a synthetic entry when the cached date is already present', async () => {
    fakeClient = createFakeSupabaseClient({
      availability_cache: [
        { user_id: 'user-1', room_id: '638851', date: '2026-07-12', num_avail: 0 },
      ],
    })
    const result = await overlayAvailabilityCache(basePrices, 'user-1', '638851')
    expect(result).toHaveLength(basePrices.length)
  })

  it('falls back to the original prices if the Supabase call throws', async () => {
    fakeClient = {
      from: () => {
        throw new Error('connection lost')
      },
      __table: () => [],
    }
    const result = await overlayAvailabilityCache(basePrices, 'user-1', '638851')
    expect(result).toBe(basePrices)
  })
})

// ─── writeCacheAvailability ──────────────────────────────────────────────────

describe('writeCacheAvailability', () => {
  it('inserts new rows for a freshly-blocked date range', async () => {
    const payload = [{ roomId: 638851, calendar: [{ from: '2026-07-12', to: '2026-07-13', numAvail: 0, price1: 600 }] }]
    await writeCacheAvailability(payload, 'user-1', undefined, undefined)
    const rows = fakeClient.__table('availability_cache')
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.date).sort()).toEqual(['2026-07-12', '2026-07-13'])
    expect(rows[0]).toMatchObject({ num_avail: 0 })
  })

  it('preserves the price of an already-cached date when only num_avail changes (unblock)', async () => {
    // Regression: unblocking (numAvail:1, no price1 change) must not zero out
    // a price that was previously set via a full block-with-price write.
    fakeClient = createFakeSupabaseClient({
      availability_cache: [
        { user_id: 'user-1', room_id: '638851', date: '2026-07-12', num_avail: 0, price: 450, min_stay: 2, cached_at: 'x' },
      ],
    })
    const payload = [{ roomId: 638851, calendar: [{ from: '2026-07-12', to: '2026-07-12', numAvail: 1, price1: 450 }] }]
    await writeCacheAvailability(payload, 'user-1', undefined, undefined)
    const rows = fakeClient.__table('availability_cache')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ num_avail: 1, price: 450, min_stay: 2 })
  })

  it('does not throw and leaves the cache untouched when the payload has no numAvail entries', async () => {
    const payload = [{ roomId: 638851, calendar: [{ from: '2026-07-12', to: '2026-07-12', price1: 600 }] }]
    await expect(writeCacheAvailability(payload, 'user-1', undefined, undefined)).resolves.toBeUndefined()
    expect(fakeClient.__table('availability_cache')).toHaveLength(0)
  })

  it('swallows Supabase errors instead of throwing (non-fatal by design)', async () => {
    fakeClient = {
      from: () => {
        throw new Error('connection lost')
      },
      __table: () => [],
    }
    const payload = [{ roomId: 638851, calendar: [{ from: '2026-07-12', to: '2026-07-12', numAvail: 0 }] }]
    await expect(writeCacheAvailability(payload, 'user-1', undefined, undefined)).resolves.toBeUndefined()
  })
})
