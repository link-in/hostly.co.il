import { vi, describe, it, expect } from 'vitest'
import type { AssistantContext, ContextResult } from '../context'
import { confirmPendingAction, rejectPendingAction, type ExecuteDeps } from './executeAction'
import type { PendingActionRow } from './types'

const now = new Date('2026-10-22T18:00:00.000Z')

const context: AssistantContext = {
  userId: 'user-1',
  displayName: 'דלית',
  channel: 'web',
  properties: [{ propertyId: 306559, rooms: [{ roomId: 638851, name: 'נוף הרים' }] }],
}

const stay = {
  propertyId: 306559,
  roomId: 638851,
  roomName: 'נוף הרים',
  from: '2026-10-29',
  to: '2026-10-30',
  checkIn: '2026-10-29',
  checkOut: '2026-10-31',
  nights: 2,
}

function row(overrides: Partial<PendingActionRow> = {}): PendingActionRow {
  return {
    id: 'action-1',
    user_id: 'user-1',
    channel: 'web',
    action_type: 'block_dates',
    payload: { ...stay, reason: 'שיפוץ' },
    status: 'executing',
    result: null,
    expires_at: '2026-10-22T18:15:00.000Z',
    created_at: '2026-10-22T18:00:00.000Z',
    resolved_at: null,
    ...overrides,
  }
}

const target = { userId: 'user-1', propertyId: 306559, roomId: 638851 }
const blockPayload = [{ roomId: 638851, propertyId: 306559, calendar: [{ from: '2026-10-29', to: '2026-10-30', numAvail: 0 }] }]

function makeDeps(overrides: Partial<ExecuteDeps> = {}): ExecuteDeps {
  return {
    claimPendingAction: vi.fn<ExecuteDeps['claimPendingAction']>(async () => row()),
    getPendingAction: vi.fn<ExecuteDeps['getPendingAction']>(async () => null),
    closePendingAction: vi.fn<ExecuteDeps['closePendingAction']>(async () => true),
    finishPendingAction: vi.fn<ExecuteDeps['finishPendingAction']>(async () => undefined),
    loadAssistantContext: vi.fn<ExecuteDeps['loadAssistantContext']>(async (): Promise<ContextResult> => ({ ok: true, context })),
    blockRoomDates: vi.fn<ExecuteDeps['blockRoomDates']>(async () => ({ ok: true, data: blockPayload })),
    updateRoomPrice: vi.fn<ExecuteDeps['updateRoomPrice']>(async () => ({ ok: true, data: [] })),
    writeCacheAvailability: vi.fn<ExecuteDeps['writeCacheAvailability']>(async () => undefined),
    now: () => now,
    ...overrides,
  }
}

describe('confirmPendingAction', () => {
  it('blocks the nights in Beds24, updates the dashboard cache and records success', async () => {
    const deps = makeDeps()

    const outcome = await confirmPendingAction('user-1', 'action-1', deps)

    expect(outcome).toMatchObject({ ok: true, status: 'executed' })
    expect(deps.claimPendingAction).toHaveBeenCalledWith('user-1', 'action-1', now)
    expect(deps.blockRoomDates).toHaveBeenCalledWith(target, { from: '2026-10-29', to: '2026-10-30' })
    expect(deps.writeCacheAvailability).toHaveBeenCalledWith(blockPayload, 'user-1', '638851', '306559')
    expect(deps.finishPendingAction).toHaveBeenCalledWith('action-1', 'executed', { beds24: blockPayload }, now)
  })

  it('sets the base price and does not touch the block cache', async () => {
    const deps = makeDeps({
      claimPendingAction: vi.fn(async () =>
        row({ action_type: 'update_price', payload: { ...stay, newPrice: 800, channelPrices: [] } }),
      ),
    })

    const outcome = await confirmPendingAction('user-1', 'action-1', deps)

    expect(outcome).toMatchObject({ ok: true, status: 'executed' })
    expect(deps.updateRoomPrice).toHaveBeenCalledWith(target, { from: '2026-10-29', to: '2026-10-30' }, 800)
    expect(deps.blockRoomDates).not.toHaveBeenCalled()
    expect(deps.writeCacheAvailability).not.toHaveBeenCalled()
  })

  it('does nothing when the action was already handled (double click)', async () => {
    const deps = makeDeps({
      claimPendingAction: vi.fn(async () => null),
      getPendingAction: vi.fn(async () => row({ status: 'executed' })),
    })

    const outcome = await confirmPendingAction('user-1', 'action-1', deps)

    expect(outcome).toMatchObject({ ok: false, code: 'already_resolved' })
    expect(deps.blockRoomDates).not.toHaveBeenCalled()
  })

  it('marks a stale pending action as expired', async () => {
    const deps = makeDeps({
      claimPendingAction: vi.fn(async () => null),
      getPendingAction: vi.fn(async () => row({ status: 'pending' })),
    })

    const outcome = await confirmPendingAction('user-1', 'action-1', deps)

    expect(outcome).toMatchObject({ ok: false, code: 'expired' })
    expect(deps.closePendingAction).toHaveBeenCalledWith('user-1', 'action-1', 'expired', now)
  })

  it("reports not_found for an unknown or foreign action", async () => {
    const deps = makeDeps({ claimPendingAction: vi.fn(async () => null) })
    expect(await confirmPendingAction('user-2', 'action-1', deps)).toMatchObject({ ok: false, code: 'not_found' })
  })

  it('refuses when the room no longer belongs to the user', async () => {
    const deps = makeDeps({
      loadAssistantContext: vi.fn(async (): Promise<ContextResult> => ({
        ok: true,
        context: { ...context, properties: [{ propertyId: 306559, rooms: [{ roomId: 1, name: 'אחר' }] }] },
      })),
    })

    const outcome = await confirmPendingAction('user-1', 'action-1', deps)

    expect(outcome).toMatchObject({ ok: false, code: 'room_not_owned' })
    expect(deps.blockRoomDates).not.toHaveBeenCalled()
    expect(deps.finishPendingAction).toHaveBeenCalledWith('action-1', 'failed', { code: 'room_not_owned' }, now)
  })

  it('refuses when the account became unavailable', async () => {
    const deps = makeDeps({ loadAssistantContext: vi.fn(async (): Promise<ContextResult> => ({ ok: false, code: 'beds24_suspended' })) })
    expect(await confirmPendingAction('user-1', 'action-1', deps)).toMatchObject({ ok: false, code: 'account_unavailable' })
    expect(deps.blockRoomDates).not.toHaveBeenCalled()
  })

  it('refuses when the nights are already in the past', async () => {
    const deps = makeDeps({ now: () => new Date('2026-10-29T22:30:00.000Z') })
    expect(await confirmPendingAction('user-1', 'action-1', deps)).toMatchObject({ ok: false, code: 'past_date' })
    expect(deps.blockRoomDates).not.toHaveBeenCalled()
  })

  it('refuses a tampered payload', async () => {
    const deps = makeDeps({ claimPendingAction: vi.fn(async () => row({ payload: { ...stay, roomId: 'DROP TABLE' } })) })
    expect(await confirmPendingAction('user-1', 'action-1', deps)).toMatchObject({ ok: false, code: 'invalid_payload' })
    expect(deps.blockRoomDates).not.toHaveBeenCalled()
  })

  it('records a Beds24 rejection without touching the cache', async () => {
    const error = { kind: 'rejected' as const, message: 'invalid roomId' }
    const deps = makeDeps({ blockRoomDates: vi.fn(async () => ({ ok: false as const, error })) })

    const outcome = await confirmPendingAction('user-1', 'action-1', deps)

    expect(outcome).toMatchObject({ ok: false, code: 'beds24_failed' })
    expect(deps.writeCacheAvailability).not.toHaveBeenCalled()
    expect(deps.finishPendingAction).toHaveBeenCalledWith('action-1', 'failed', { code: 'beds24_failed', error }, now)
  })

  it('still reports success when only the audit write fails', async () => {
    const deps = makeDeps({ finishPendingAction: vi.fn(async () => Promise.reject(new Error('db down'))) })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await confirmPendingAction('user-1', 'action-1', deps)).toMatchObject({ ok: true, status: 'executed' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('rejectPendingAction', () => {
  it('cancels a pending action without calling Beds24', async () => {
    const deps = makeDeps()
    expect(await rejectPendingAction('user-1', 'action-1', deps)).toMatchObject({ ok: true, status: 'rejected' })
    expect(deps.closePendingAction).toHaveBeenCalledWith('user-1', 'action-1', 'rejected', now)
    expect(deps.blockRoomDates).not.toHaveBeenCalled()
  })

  it('reports an action that was already handled', async () => {
    const deps = makeDeps({
      closePendingAction: vi.fn(async () => false),
      getPendingAction: vi.fn(async () => row({ status: 'executed' })),
    })
    expect(await rejectPendingAction('user-1', 'action-1', deps)).toMatchObject({ ok: false, code: 'already_resolved' })
  })
})
