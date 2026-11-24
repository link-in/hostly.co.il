import { describe, expect, it, vi } from 'vitest'
import { createFakeDeps, freeCalendar, makeConnection, seedCampaign } from '@/__tests__/helpers/fakePromotions'
import { checkConnectionHealth, expiresSoon } from './connectionHealth'
import { monitorCampaigns, stopReasonFor } from './monitor'

const TODAY = '2026-11-24'
const active = (overrides = {}) => seedCampaign({ status: 'active', externalIds: { campaignId: 'meta-c1' }, ...overrides })

describe('stopReasonFor', () => {
  it('stops when the stay starts or any night is taken', () => {
    const window = { checkIn: '2026-11-26', checkOut: '2026-11-28' }
    expect(stopReasonFor(window, '2026-11-26', [true, true])).toBe('window_started')
    expect(stopReasonFor(window, TODAY, [true, false])).toBe('booked')
    expect(stopReasonFor(window, TODAY, [])).toBe('booked')
    expect(stopReasonFor(window, TODAY, [true, true])).toBeNull()
  })
})

describe('monitorCampaigns', () => {
  it('refreshes stats while the dates are still free', async () => {
    const { deps, state, publisher } = createFakeDeps({ campaigns: [active()] })

    expect(await monitorCampaigns(deps, TODAY)).toMatchObject({ statsUpdated: 1, stopped: {} })
    expect(state.campaigns[0].stats).toMatchObject({ spend: 10, clicks: 5 })
    expect(publisher.stop).not.toHaveBeenCalled()
  })

  it('stops the ad as soon as a night in the window is booked', async () => {
    const { deps, state, publisher } = createFakeDeps({
      campaigns: [active()],
      calendar: freeCalendar('2026-11-20', 40, ['2026-11-27']),
    })

    expect(await monitorCampaigns(deps, TODAY)).toMatchObject({ stopped: { booked: 1 } })
    expect(publisher.stop).toHaveBeenCalledWith(expect.anything(), { campaignId: 'meta-c1' })
    expect(state.campaigns[0]).toMatchObject({ status: 'stopped', stopReason: 'booked', stats: { spend: 10 } })
  })

  it('expires campaigns and drafts once the stay has started', async () => {
    const { deps, state } = createFakeDeps({
      campaigns: [active(), seedCampaign({ id: 'c2', roomId: 'r2' })],
    })

    const summary = await monitorCampaigns(deps, '2026-11-26')
    expect(summary).toMatchObject({ expiredDrafts: 1, stopped: { window_started: 1 } })
    expect(state.campaigns.map((c) => c.status)).toEqual(['expired', 'expired'])
  })

  it('continues after a failure on one campaign', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { deps, publisher } = createFakeDeps({ campaigns: [active(), active({ id: 'c2', roomId: 'r2' })] })
    vi.mocked(publisher.fetchStats).mockRejectedValueOnce(new Error('rate limit'))

    expect(await monitorCampaigns(deps, TODAY)).toMatchObject({ failed: 1, statsUpdated: 1 })
  })
})

describe('checkConnectionHealth', () => {
  const now = new Date('2026-11-24T08:00:00Z')

  it('marks revoked tokens expired and tells the host', async () => {
    const { deps, state, publisher, notifier } = createFakeDeps()
    vi.mocked(publisher.verifyConnection).mockResolvedValueOnce(false)

    expect(await checkConnectionHealth(deps, now)).toMatchObject({ checked: 1, expired: 1 })
    expect(state.connections[0].status).toBe('expired')
    expect(notifier.connectionNeedsAttention).toHaveBeenCalledWith(expect.anything(), 'Facebook ו-Instagram', true)
  })

  it('warns a week before the token expires', async () => {
    const { deps, notifier } = createFakeDeps({
      connections: [makeConnection({ tokenExpiresAt: '2026-11-28T00:00:00Z' })],
    })
    expect(await checkConnectionHealth(deps, now)).toMatchObject({ expiringSoon: 1, expired: 0 })
    expect(notifier.connectionNeedsAttention).toHaveBeenCalledWith(expect.anything(), expect.any(String), false)
  })

  it('stays quiet for healthy connections and skips already expired ones', async () => {
    const { deps, notifier } = createFakeDeps({
      connections: [makeConnection({ tokenExpiresAt: '2027-01-30T00:00:00Z' }), makeConnection({ userId: 'u2', status: 'expired' })],
    })
    expect(await checkConnectionHealth(deps, now)).toMatchObject({ checked: 1, expired: 0, expiringSoon: 0 })
    expect(notifier.connectionNeedsAttention).not.toHaveBeenCalled()
  })

  it('expiresSoon ignores unknown expiry', () => {
    expect(expiresSoon({ tokenExpiresAt: null }, now)).toBe(false)
  })
})
