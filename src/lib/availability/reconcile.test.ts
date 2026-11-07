import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createFakeSupabaseClient, type FakeSupabaseClient } from '@/__tests__/helpers/fakeSupabase'
import { fetchBeds24OpenState, pushBlackout, verifyDatesBlocked } from '@/lib/availability/sync'
import { sendWhatsAppToAll } from '@/lib/notifications/ownerPhones'
import { groupManualBlocks, listManualBlocks, buildBlockDriftMessage, reconcileRoomBlocks } from './reconcile'

let fakeClient: FakeSupabaseClient

vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => fakeClient }))
vi.mock('@/lib/availability/sync', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/availability/sync')>()
  return { ...actual, fetchBeds24OpenState: vi.fn(), pushBlackout: vi.fn(), verifyDatesBlocked: vi.fn() }
})
vi.mock('@/lib/notifications/ownerPhones', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/notifications/ownerPhones')>()
  return { ...actual, sendWhatsAppToAll: vi.fn().mockResolvedValue([]) }
})

const GROUP = { userId: 'user-1', roomId: '638851', propertyId: '306559', dates: ['2026-10-22', '2026-10-23', '2026-10-24'] }

beforeEach(() => {
  fakeClient = createFakeSupabaseClient({
    availability_cache: [],
    users: [{ id: 'user-1', phone_number: '0501234567', secondary_phone_number: null }],
  })
  vi.mocked(fetchBeds24OpenState).mockReset()
  vi.mocked(pushBlackout).mockReset()
  vi.mocked(verifyDatesBlocked).mockReset()
  vi.mocked(sendWhatsAppToAll).mockClear()
})

describe('groupManualBlocks', () => {
  it('groups by user and room with sorted unique dates', () => {
    const groups = groupManualBlocks([
      { user_id: 'u1', room_id: '1', property_id: 'p', date: '2026-10-23' },
      { user_id: 'u1', room_id: '1', property_id: 'p', date: '2026-10-22' },
      { user_id: 'u1', room_id: '1', property_id: 'p', date: '2026-10-22' },
      { user_id: 'u1', room_id: '2', property_id: null, date: '2026-10-22' },
    ])
    expect(groups).toEqual([
      { userId: 'u1', roomId: '1', propertyId: 'p', dates: ['2026-10-22', '2026-10-23'] },
      { userId: 'u1', roomId: '2', propertyId: undefined, dates: ['2026-10-22'] },
    ])
  })
})

describe('listManualBlocks', () => {
  it('returns only manual blocks inside the date window', async () => {
    fakeClient = createFakeSupabaseClient({
      availability_cache: [
        { user_id: 'u1', room_id: '1', property_id: 'p', date: '2026-10-20', is_manual_block: true },
        { user_id: 'u1', room_id: '1', property_id: 'p', date: '2026-10-22', is_manual_block: true },
        { user_id: 'u1', room_id: '1', property_id: 'p', date: '2026-10-23', is_manual_block: false },
        { user_id: 'u1', room_id: '1', property_id: 'p', date: '2027-12-01', is_manual_block: true },
      ],
    })
    await expect(listManualBlocks('2026-10-21', '2027-10-21')).resolves.toEqual([
      { userId: 'u1', roomId: '1', propertyId: 'p', dates: ['2026-10-22'] },
    ])
  })
})

describe('buildBlockDriftMessage', () => {
  it('lists repaired and still-open dates separately', () => {
    const message = buildBlockDriftMessage(['2026-10-22'], ['2026-10-24'])
    expect(message).toContain('נסגרו מחדש')
    expect(message).toContain('22/10')
    expect(message).toContain('ולא הצלחנו לסגור')
    expect(message).toContain('24/10')
  })

  it('omits the still-open section when everything was repaired', () => {
    expect(buildBlockDriftMessage(['2026-10-22'], [])).not.toContain('ולא הצלחנו לסגור')
  })
})

describe('reconcileRoomBlocks', () => {
  it('does nothing when every manual block is closed in Beds24', async () => {
    vi.mocked(fetchBeds24OpenState).mockResolvedValue({
      availability: { '2026-10-22': false, '2026-10-23': false, '2026-10-24': false },
      calendar: {},
    })
    const result = await reconcileRoomBlocks(GROUP)
    expect(result).toMatchObject({ checked: 3, drifted: [], repaired: [], stillOpen: [] })
    expect(pushBlackout).not.toHaveBeenCalled()
    expect(sendWhatsAppToAll).not.toHaveBeenCalled()
  })

  it('re-closes drifted dates, verifies them and notifies the owner', async () => {
    vi.mocked(fetchBeds24OpenState).mockResolvedValue({
      availability: { '2026-10-22': true, '2026-10-23': false, '2026-10-24': true },
      calendar: {},
    })
    vi.mocked(pushBlackout).mockResolvedValue(true)
    vi.mocked(verifyDatesBlocked).mockResolvedValue(['2026-10-24'])

    const result = await reconcileRoomBlocks(GROUP)

    expect(pushBlackout).toHaveBeenCalledWith(
      { userId: 'user-1', roomId: '638851', propertyId: '306559' },
      ['2026-10-22', '2026-10-24'],
    )
    expect(result).toMatchObject({ drifted: ['2026-10-22', '2026-10-24'], repaired: ['2026-10-22'], stillOpen: ['2026-10-24'] })
    expect(result.error).toBeUndefined()
    expect(sendWhatsAppToAll).toHaveBeenCalledTimes(1)
    const [phones, message, meta] = vi.mocked(sendWhatsAppToAll).mock.calls[0]
    expect(phones).toEqual(['+972501234567'])
    expect(message).toContain('22/10')
    expect(meta).toMatchObject({ userId: 'user-1', messageType: 'system_alert', recipientRole: 'owner' })
  })

  it('reports every drifted date as still open when Beds24 rejects the push', async () => {
    vi.mocked(fetchBeds24OpenState).mockResolvedValue({ availability: { '2026-10-22': true }, calendar: {} })
    vi.mocked(pushBlackout).mockResolvedValue(false)

    const result = await reconcileRoomBlocks(GROUP)

    expect(verifyDatesBlocked).not.toHaveBeenCalled()
    expect(result).toMatchObject({ repaired: [], stillOpen: ['2026-10-22'], error: 'beds24_push_failed' })
    expect(sendWhatsAppToAll).toHaveBeenCalledTimes(1)
  })

  it('returns an error without touching Beds24 when it cannot be read', async () => {
    vi.mocked(fetchBeds24OpenState).mockResolvedValue(null)
    const result = await reconcileRoomBlocks(GROUP)
    expect(result.error).toBe('beds24_unreachable')
    expect(pushBlackout).not.toHaveBeenCalled()
    expect(sendWhatsAppToAll).not.toHaveBeenCalled()
  })
})
