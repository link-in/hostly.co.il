import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createFakeSupabaseClient, type FakeSupabaseClient } from '@/__tests__/helpers/fakeSupabase'
import {
  claimPendingAction,
  closePendingAction,
  createPendingAction,
  finishPendingAction,
  getPendingAction,
} from './pendingActions'
import type { ProposedAction } from './types'

let fakeClient: FakeSupabaseClient
vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => fakeClient }))

const now = new Date('2026-10-22T18:00:00.000Z')
const action: ProposedAction = {
  actionType: 'block_dates',
  payload: {
    propertyId: 306559,
    roomId: 638851,
    roomName: 'נוף הרים',
    from: '2026-10-29',
    to: '2026-10-30',
    checkIn: '2026-10-29',
    checkOut: '2026-10-31',
    nights: 2,
    reason: 'שיפוץ',
  },
}

const rows = () => fakeClient.__table('ai_pending_actions')

beforeEach(() => {
  fakeClient = createFakeSupabaseClient()
})

describe('createPendingAction', () => {
  it('stores a pending action that expires after 15 minutes', async () => {
    const created = await createPendingAction('user-1', 'web', action, now)

    expect(created.expiresAt).toBe('2026-10-22T18:15:00.000Z')
    expect(rows()).toEqual([
      expect.objectContaining({
        id: created.id,
        user_id: 'user-1',
        channel: 'web',
        action_type: 'block_dates',
        payload: action.payload,
        status: 'pending',
      }),
    ])
  })
})

describe('claimPendingAction', () => {
  it('claims a pending action exactly once', async () => {
    const { id } = await createPendingAction('user-1', 'web', action, now)

    const first = await claimPendingAction('user-1', id, now)
    const second = await claimPendingAction('user-1', id, now)

    expect(first?.status).toBe('executing')
    expect(second).toBeNull()
  })

  it("cannot claim another user's action", async () => {
    const { id } = await createPendingAction('user-1', 'web', action, now)
    expect(await claimPendingAction('user-2', id, now)).toBeNull()
    expect(rows()[0].status).toBe('pending')
  })

  it('cannot claim an expired action', async () => {
    const { id } = await createPendingAction('user-1', 'web', action, now)
    const later = new Date(now.getTime() + 15 * 60 * 1000)
    expect(await claimPendingAction('user-1', id, later)).toBeNull()
  })
})

describe('finishPendingAction', () => {
  it('records the outcome of a claimed action', async () => {
    const { id } = await createPendingAction('user-1', 'web', action, now)
    await claimPendingAction('user-1', id, now)

    await finishPendingAction(id, 'executed', { ok: true }, now)

    expect(rows()[0]).toMatchObject({ status: 'executed', result: { ok: true }, resolved_at: now.toISOString() })
  })

  it('does not touch an action that was never claimed', async () => {
    const { id } = await createPendingAction('user-1', 'web', action, now)
    await finishPendingAction(id, 'executed', {}, now)
    expect(rows()[0].status).toBe('pending')
  })
})

describe('closePendingAction', () => {
  it('rejects a pending action once', async () => {
    const { id } = await createPendingAction('user-1', 'web', action, now)
    expect(await closePendingAction('user-1', id, 'rejected', now)).toBe(true)
    expect(await closePendingAction('user-1', id, 'rejected', now)).toBe(false)
    expect((await getPendingAction('user-1', id))?.status).toBe('rejected')
  })

  it('cannot reject an action that is already executing', async () => {
    const { id } = await createPendingAction('user-1', 'web', action, now)
    await claimPendingAction('user-1', id, now)
    expect(await closePendingAction('user-1', id, 'rejected', now)).toBe(false)
  })
})
