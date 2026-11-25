import { describe, expect, it, vi } from 'vitest'
import {
  createFakeDeps,
  freeCalendar,
  HOST,
  makeConnection,
  makeRule,
  seedCampaign,
  type FakeWorld,
} from '@/__tests__/helpers/fakePromotions'
import { createDrafts, roomsForRule } from './createDrafts'

const TODAY = '2026-11-24'

describe('createDrafts', () => {
  it('drafts a pending campaign for a free weekend and notifies the host once', async () => {
    const { deps, state, notifier, publisher } = createFakeDeps()

    const summary = await createDrafts(deps, TODAY)

    expect(summary).toMatchObject({ hosts: 1, opportunities: 1, drafts: 1, failed: 0 })
    expect(state.campaigns).toHaveLength(1)
    const [campaign] = state.campaigns
    expect(campaign).toMatchObject({
      status: 'pending_approval',
      roomId: 'r1',
      roomName: 'סוויטה',
      checkIn: '2026-11-26',
      checkOut: '2026-11-28',
      totalBudget: 80,
      nightlyPrice: 600,
      imageUrls: HOST.site!.imageUrls,
    })
    expect(campaign.landingUrl).toContain('checkin=2026-11-26')
    expect(campaign.landingUrl).toContain('utm_campaign=hostly_promo')
    expect(campaign.content.primaryText).toContain('600₪')
    expect(notifier.draftsReady).toHaveBeenCalledTimes(1)
    expect(publisher.launch).not.toHaveBeenCalled()
  })

  it('never drafts twice for the same window across runs', async () => {
    const { deps, state } = createFakeDeps()
    await createDrafts(deps, TODAY)
    const second = await createDrafts(deps, TODAY)

    expect(state.campaigns).toHaveLength(1)
    expect(second.skipped).toEqual({ overlaps_existing: 1 })
  })

  it('does not let two overlapping rules draft the same dates', async () => {
    const { deps, state } = createFakeDeps({
      rules: [makeRule(), makeRule({ id: 'rule2', trigger: 'custom_window', daysBefore: 3 })],
    })
    await createDrafts(deps, TODAY)

    const windows = state.campaigns.map((c) => [c.checkIn, c.checkOut])
    expect(windows).toContainEqual(['2026-11-26', '2026-11-28'])
    for (const [i, a] of state.campaigns.entries()) {
      for (const b of state.campaigns.slice(i + 1)) {
        expect(a.checkIn < b.checkOut && b.checkIn < a.checkOut).toBe(false)
      }
    }
  })

  it.each([
    ['no connection', { connections: [] }, 'no_connection'],
    ['inactive connection', { connections: [makeConnection({ status: 'expired' })] }, 'no_connection'],
    ['assets not chosen', { connections: [makeConnection({ assets: {} })] }, 'no_connection'],
    ['no published site', { host: { ...HOST, site: null } }, 'no_site'],
    ['no images', { host: { ...HOST, site: { ...HOST.site!, imageUrls: [] } } }, 'no_images'],
    ['monthly cap reached', { connections: [makeConnection({ monthlyBudgetCap: 50 })] }, 'monthly_cap_exceeded'],
  ] satisfies Array<[string, Partial<FakeWorld>, string]>)('skips when %s', async (_label, world, reason) => {
    const { deps, state, notifier } = createFakeDeps(world)
    const summary = await createDrafts(deps, TODAY)

    expect(summary.skipped).toEqual({ [reason]: 1 })
    expect(state.campaigns).toHaveLength(0)
    expect(notifier.draftsReady).toHaveBeenCalledWith(expect.anything(), [])
  })

  it('counts budget of approved campaigns toward the monthly cap', async () => {
    const { deps } = createFakeDeps({
      connections: [makeConnection({ monthlyBudgetCap: 150 })],
      campaigns: [seedCampaign({ id: 'old', roomId: 'r2', status: 'active', totalBudget: 100 })],
    })
    expect((await createDrafts(deps, TODAY)).skipped).toEqual({ monthly_cap_exceeded: 1 })
  })

  it('skips booked weekends and ignores disabled rules', async () => {
    const booked = createFakeDeps({ calendar: freeCalendar('2026-11-20', 40, ['2026-11-26', '2026-11-27']) })
    expect((await createDrafts(booked.deps, TODAY)).drafts).toBe(0)

    const disabled = createFakeDeps({ rules: [makeRule({ enabled: false })] })
    expect((await createDrafts(disabled.deps, TODAY)).hosts).toBe(0)
  })

  it('keeps going when content generation fails for one opportunity', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { deps, state } = createFakeDeps({ rules: [makeRule({ roomId: null })] })
    let calls = 0
    deps.content = {
      id: 'flaky',
      generate: async (input) => {
        calls += 1
        if (calls === 1) throw new Error('AI down')
        return { headline: 'h', primaryText: input.siteTitle, description: '', callToAction: 'BOOK_TRAVEL', hashtags: [] }
      },
    }

    const summary = await createDrafts(deps, TODAY)
    expect(summary.failed).toBe(1)
    expect(state.campaigns).toHaveLength(1)
    expect(state.campaigns[0].roomId).toBe('r2')
  })
})

describe('roomsForRule', () => {
  it('uses every room for an all-rooms rule, and the named room otherwise', () => {
    expect(roomsForRule(makeRule({ roomId: null }), HOST).map((r) => r.id)).toEqual(['r1', 'r2'])
    expect(roomsForRule(makeRule({ roomId: 'r9' }), HOST)).toEqual([{ id: 'r9', name: null }])
  })
})
