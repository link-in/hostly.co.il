import { describe, expect, it, vi } from 'vitest'
import type { CachedAvailability } from '@/lib/availability/cache'
import { bookingWindow, loadSiteAvailability, type SiteAvailabilityDeps } from './siteAvailability'

const NOW = new Date('2026-10-22T12:00:00Z')
const room = { userId: 'user-1', roomId: '42' }

function snapshot(cachedAt: string, price: number): CachedAvailability {
  return {
    roomId: '42',
    propertyId: '7',
    cachedAt,
    availability: [{ date: '2026-11-01', price, available: true, minStay: 0 }],
  }
}

function makeDeps(overrides: Partial<SiteAvailabilityDeps> = {}): SiteAvailabilityDeps {
  return {
    readCache: vi.fn(async () => null),
    fetchLive: vi.fn(async () => null),
    refreshInBackground: vi.fn(),
    now: () => NOW,
    ...overrides,
  }
}

describe('bookingWindow', () => {
  it('covers twelve months from today', () => {
    expect(bookingWindow(NOW)).toEqual({ from: '2026-10-22', to: '2027-10-22' })
  })
})

describe('loadSiteAvailability', () => {
  it('serves a fresh cache without calling Beds24', async () => {
    const deps = makeDeps({ readCache: async () => snapshot('2026-10-22T11:45:00Z', 800) })
    expect(await loadSiteAvailability(room, deps)).toEqual([{ date: '2026-11-01', price: 800, available: true, minStay: 1 }])
    expect(deps.fetchLive).not.toHaveBeenCalled()
    expect(deps.refreshInBackground).not.toHaveBeenCalled()
  })

  it('goes live and re-warms the cache when the cache is stale', async () => {
    const deps = makeDeps({
      readCache: async () => snapshot('2026-10-22T06:00:00Z', 800),
      fetchLive: async () => snapshot('2026-10-22T12:00:00Z', 950),
    })
    expect((await loadSiteAvailability(room, deps))?.[0].price).toBe(950)
    expect(deps.refreshInBackground).toHaveBeenCalledWith(room)
  })

  it('falls back to the stale cache when Beds24 is unreachable', async () => {
    const deps = makeDeps({ readCache: async () => snapshot('2026-10-21T06:00:00Z', 800) })
    expect((await loadSiteAvailability(room, deps))?.[0].price).toBe(800)
  })

  it('returns null when there is no data at all', async () => {
    expect(await loadSiteAvailability(room, makeDeps())).toBeNull()
  })
})
