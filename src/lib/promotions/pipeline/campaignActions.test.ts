import { describe, expect, it, vi } from 'vitest'
import { createFakeDeps, makeConnection, seedCampaign, type FakeWorld } from '@/__tests__/helpers/fakePromotions'
import { approveCampaign, campaignSchedule, editCampaign, rejectCampaign, stopCampaign } from './campaignActions'

const NOW = new Date('2026-11-24T08:00:00.000Z')

describe('campaignSchedule', () => {
  it('runs until noon of check-in day', () => {
    expect(campaignSchedule(NOW, '2026-11-26')).toEqual({ start: NOW, end: new Date('2026-11-26T10:00:00.000Z') })
  })

  it('extends to a full day when check-in is close, but never past check-in day', () => {
    const lateTuesday = new Date('2026-11-25T15:00:00.000Z')
    expect(campaignSchedule(lateTuesday, '2026-11-26')?.end).toEqual(new Date('2026-11-26T15:00:00.000Z'))
    expect(campaignSchedule(new Date('2026-11-26T08:00:00.000Z'), '2026-11-26')).toBeNull()
  })
})

describe('approveCampaign', () => {
  it('publishes, stores the channel ids and marks the campaign active', async () => {
    const { deps, state, publisher } = createFakeDeps({ campaigns: [seedCampaign()] })

    const result = await approveCampaign(deps, 'u1', 'c1', NOW)

    expect(result).toMatchObject({ ok: true, campaign: { status: 'active', externalIds: { campaignId: 'meta-c1' } } })
    expect(state.campaigns[0].approvedAt).toBe(NOW.toISOString())
    expect(publisher.launch).toHaveBeenCalledWith(
      { accessToken: 'token', assets: { adAccountId: 'act_1', pageId: '2' } },
      expect.objectContaining({ totalBudget: 80, endTime: new Date('2026-11-26T10:00:00.000Z') }),
    )
  })

  it('cannot be approved twice', async () => {
    const { deps, publisher } = createFakeDeps({ campaigns: [seedCampaign()] })
    await approveCampaign(deps, 'u1', 'c1', NOW)
    expect(await approveCampaign(deps, 'u1', 'c1', NOW)).toMatchObject({ ok: false, code: 'invalid_state' })
    expect(publisher.launch).toHaveBeenCalledTimes(1)
  })

  it('marks the campaign failed and tells the host when the channel rejects it', async () => {
    const { deps, state, publisher, notifier } = createFakeDeps({ campaigns: [seedCampaign()] })
    vi.mocked(publisher.launch).mockRejectedValueOnce(new Error('Ad account disabled'))

    const result = await approveCampaign(deps, 'u1', 'c1', NOW)

    expect(result).toMatchObject({ ok: false, code: 'launch_failed', message: 'Ad account disabled' })
    expect(state.campaigns[0]).toMatchObject({ status: 'failed', error: 'Ad account disabled' })
    expect(notifier.launchFailed).toHaveBeenCalled()
  })

  it('expires a draft whose dates are too close', async () => {
    const { deps, state, publisher } = createFakeDeps({ campaigns: [seedCampaign()] })
    const result = await approveCampaign(deps, 'u1', 'c1', new Date('2026-11-26T08:00:00.000Z'))

    expect(result).toMatchObject({ ok: false, code: 'too_late' })
    expect(state.campaigns[0].status).toBe('expired')
    expect(publisher.launch).not.toHaveBeenCalled()
  })

  it.each([
    ['the connection is missing', { connections: [] }, 'no_connection'],
    ['the monthly cap would be exceeded', { connections: [makeConnection({ monthlyBudgetCap: 50 })] }, 'monthly_cap_exceeded'],
  ] satisfies Array<[string, Partial<FakeWorld>, string]>)('refuses when %s and leaves the draft pending', async (_label, world, code) => {
    const { deps, state, publisher } = createFakeDeps({ ...world, campaigns: [seedCampaign()] })
    expect(await approveCampaign(deps, 'u1', 'c1', NOW)).toMatchObject({ ok: false, code })
    expect(state.campaigns[0].status).toBe('pending_approval')
    expect(publisher.launch).not.toHaveBeenCalled()
  })

  it("does not touch another host's campaign", async () => {
    const { deps } = createFakeDeps({ campaigns: [seedCampaign()] })
    expect(await approveCampaign(deps, 'someone-else', 'c1', NOW)).toMatchObject({ ok: false, code: 'not_found' })
  })
})

describe('edit / reject / stop', () => {
  it('edits copy and budget of a pending draft only', async () => {
    const { deps, state } = createFakeDeps({ campaigns: [seedCampaign()] })
    const content = { ...state.campaigns[0].content, headline: 'חדש' }

    expect(await editCampaign(deps, 'u1', 'c1', { content, totalBudget: 120 })).toMatchObject({
      ok: true,
      campaign: { totalBudget: 120, content: { headline: 'חדש' } },
    })

    state.campaigns[0].status = 'active'
    expect(await editCampaign(deps, 'u1', 'c1', { totalBudget: 1 })).toMatchObject({ ok: false, code: 'invalid_state' })
  })

  it('rejects a pending draft', async () => {
    const { deps, state } = createFakeDeps({ campaigns: [seedCampaign()] })
    expect(await rejectCampaign(deps, 'u1', 'c1')).toMatchObject({ ok: true })
    expect(state.campaigns[0].status).toBe('rejected')
  })

  it('stops an active campaign on the channel', async () => {
    const { deps, state, publisher } = createFakeDeps({
      campaigns: [seedCampaign({ status: 'active', externalIds: { campaignId: 'meta-c1' } })],
    })

    expect(await stopCampaign(deps, 'u1', 'c1', NOW)).toMatchObject({ ok: true })
    expect(publisher.stop).toHaveBeenCalledWith(expect.anything(), { campaignId: 'meta-c1' })
    expect(state.campaigns[0]).toMatchObject({ status: 'stopped', stopReason: 'manual' })
  })

  it('keeps the campaign active when the channel refuses to stop it', async () => {
    const { deps, state, publisher } = createFakeDeps({ campaigns: [seedCampaign({ status: 'active' })] })
    vi.mocked(publisher.stop).mockRejectedValueOnce(new Error('network'))

    expect(await stopCampaign(deps, 'u1', 'c1', NOW)).toMatchObject({ ok: false, code: 'stop_failed' })
    expect(state.campaigns[0].status).toBe('active')
  })
})
