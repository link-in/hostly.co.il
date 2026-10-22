import { vi, describe, it, expect } from 'vitest'
import { createFakeSupabaseClient, type FakeSupabaseClient } from '@/__tests__/helpers/fakeSupabase'
import { applyManualBlocks } from './manualBlocks'

let fakeClient: FakeSupabaseClient
vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => fakeClient }))

const nights = ['2026-11-05', '2026-11-06', '2026-11-07']

function cacheRow(date: string, numAvail: number, isManualBlock: boolean, roomId = '638851') {
  return { user_id: 'user-1', room_id: roomId, date, num_avail: numAvail, is_manual_block: isManualBlock }
}

describe('applyManualBlocks', () => {
  it('closes nights blocked from the dashboard', async () => {
    fakeClient = createFakeSupabaseClient({ availability_cache: [cacheRow('2026-11-06', 0, true)] })
    expect(await applyManualBlocks('user-1', 638851, nights, {})).toEqual({
      '2026-11-05': true,
      '2026-11-06': false,
      '2026-11-07': true,
    })
  })

  it('never reopens a night Beds24 reports as closed', async () => {
    fakeClient = createFakeSupabaseClient({ availability_cache: [cacheRow('2026-11-05', 1, false)] })
    const result = await applyManualBlocks('user-1', 638851, nights, { '2026-11-05': false })
    expect(result['2026-11-05']).toBe(false)
  })

  it('ignores blocks of other rooms and drops cached dates outside the stay', async () => {
    fakeClient = createFakeSupabaseClient({
      availability_cache: [cacheRow('2026-11-06', 0, true, '999'), cacheRow('2026-12-01', 0, true)],
    })
    expect(await applyManualBlocks('user-1', 638851, nights, {})).toEqual({
      '2026-11-05': true,
      '2026-11-06': true,
      '2026-11-07': true,
    })
  })
})
