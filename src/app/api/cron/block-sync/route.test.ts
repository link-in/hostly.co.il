import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { listManualBlocks, reconcileRoomBlocks } from '@/lib/availability/reconcile'
import { GET } from './route'

vi.mock('@/lib/availability/reconcile', () => ({ listManualBlocks: vi.fn(), reconcileRoomBlocks: vi.fn() }))
vi.mock('@/lib/reviewReminders/dateUtils', () => ({
  getDateStringInTimeZone: (offset: number) => (offset === 0 ? '2026-10-21' : '2027-10-21'),
}))

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET

function request(authorization?: string): Request {
  return new Request('http://localhost/api/cron/block-sync', { headers: authorization ? { authorization } : {} })
}

const groupA = { userId: 'u1', roomId: '1', dates: ['2026-10-22', '2026-10-23'] }
const groupB = { userId: 'u2', roomId: '2', dates: ['2026-10-24'] }

beforeEach(() => {
  process.env.CRON_SECRET = 'test-cron-secret'
  vi.mocked(listManualBlocks).mockReset()
  vi.mocked(reconcileRoomBlocks).mockReset()
})

afterEach(() => {
  process.env.CRON_SECRET = ORIGINAL_CRON_SECRET
})

describe('GET /api/cron/block-sync', () => {
  it('rejects requests without the cron secret', async () => {
    expect((await GET(request())).status).toBe(401)
    expect((await GET(request('Bearer wrong'))).status).toBe(401)
    expect(listManualBlocks).not.toHaveBeenCalled()
  })

  it('rejects every request when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET
    expect((await GET(request('Bearer undefined'))).status).toBe(401)
  })

  it('checks manual blocks from today for the next year and sums the results', async () => {
    vi.mocked(listManualBlocks).mockResolvedValue([groupA, groupB])
    vi.mocked(reconcileRoomBlocks)
      .mockResolvedValueOnce({ userId: 'u1', roomId: '1', checked: 2, drifted: ['2026-10-22'], repaired: ['2026-10-22'], stillOpen: [] })
      .mockResolvedValueOnce({ userId: 'u2', roomId: '2', checked: 1, drifted: [], repaired: [], stillOpen: [] })

    const response = await GET(request('Bearer test-cron-secret'))
    const body = await response.json()

    expect(listManualBlocks).toHaveBeenCalledWith('2026-10-21', '2027-10-21')
    expect(body).toMatchObject({ rooms: 2, datesChecked: 3, drifted: 1, repaired: 1, stillOpen: 0, failedRooms: 0 })
  })

  it('keeps going when one room throws', async () => {
    vi.mocked(listManualBlocks).mockResolvedValue([groupA, groupB])
    vi.mocked(reconcileRoomBlocks)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ userId: 'u2', roomId: '2', checked: 1, drifted: [], repaired: [], stillOpen: [] })

    const body = await (await GET(request('Bearer test-cron-secret'))).json()

    expect(reconcileRoomBlocks).toHaveBeenCalledTimes(2)
    expect(body).toMatchObject({ rooms: 2, failedRooms: 1 })
    expect(body.results[0]).toMatchObject({ roomId: '1', error: 'boom' })
  })
})
