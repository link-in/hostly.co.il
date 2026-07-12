/**
 * Integration tests for the review-reminders cron endpoint.
 * `getUsersWithBeds24Access` and `processReviewRemindersForUser` are mocked —
 * this only verifies the auth guard and per-user aggregation/error isolation.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getUsersWithBeds24Access } from '@/lib/db/users'
import { processReviewRemindersForUser } from '@/lib/reviewReminders/service'
import { getYesterdayInIsrael } from '@/lib/reviewReminders/dateUtils'
import { GET } from './route'
import type { UserWithBeds24Access } from '@/lib/db/users'

vi.mock('@/lib/db/users', () => ({ getUsersWithBeds24Access: vi.fn() }))
vi.mock('@/lib/reviewReminders/service', () => ({ processReviewRemindersForUser: vi.fn() }))
vi.mock('@/lib/reviewReminders/dateUtils', () => ({ getYesterdayInIsrael: vi.fn() }))

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET

function makeUser(id: string): UserWithBeds24Access {
  return {
    id,
    propertyId: '306559',
    displayName: 'Mountain View',
    googleReviewUrl: null,
    beds24Token: 'token',
    beds24RefreshToken: 'refresh',
  }
}

function request(authorization?: string): Request {
  return new Request('http://localhost/api/cron/review-reminders', {
    headers: authorization ? { authorization } : {},
  })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-cron-secret'
  vi.mocked(getYesterdayInIsrael).mockReturnValue('2026-07-10')
  vi.mocked(getUsersWithBeds24Access).mockReset()
  vi.mocked(processReviewRemindersForUser).mockReset()
})

afterEach(() => {
  process.env.CRON_SECRET = ORIGINAL_CRON_SECRET
})

describe('GET /api/cron/review-reminders — auth guard', () => {
  it('rejects a request with no Authorization header', async () => {
    const response = await GET(request())
    expect(response.status).toBe(401)
    expect(getUsersWithBeds24Access).not.toHaveBeenCalled()
  })

  it('rejects a request with the wrong secret', async () => {
    const response = await GET(request('Bearer wrong-secret'))
    expect(response.status).toBe(401)
  })

  it('rejects every request when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET
    const response = await GET(request('Bearer anything'))
    expect(response.status).toBe(401)
  })

  it('accepts a request with the correct bearer secret', async () => {
    vi.mocked(getUsersWithBeds24Access).mockResolvedValue([])
    const response = await GET(request('Bearer test-cron-secret'))
    expect(response.status).toBe(200)
  })
})

describe('GET /api/cron/review-reminders — aggregation', () => {
  it('sums per-user summaries across all hosts', async () => {
    vi.mocked(getUsersWithBeds24Access).mockResolvedValue([makeUser('user-1'), makeUser('user-2')])
    vi.mocked(processReviewRemindersForUser)
      .mockResolvedValueOnce({ userId: 'user-1', bookingsFound: 2, sent: 1, skipped: 1, failed: 0 })
      .mockResolvedValueOnce({ userId: 'user-2', bookingsFound: 1, sent: 1, skipped: 0, failed: 0 })

    const response = await GET(request('Bearer test-cron-secret'))
    const body = await response.json()

    expect(body).toMatchObject({
      date: '2026-07-10',
      usersProcessed: 2,
      totalBookingsFound: 3,
      totalSent: 2,
      totalSkipped: 1,
      totalFailed: 0,
    })
    expect(processReviewRemindersForUser).toHaveBeenCalledTimes(2)
  })

  it('isolates a per-user failure so other hosts are still processed', async () => {
    vi.mocked(getUsersWithBeds24Access).mockResolvedValue([makeUser('user-1'), makeUser('user-2')])
    vi.mocked(processReviewRemindersForUser)
      .mockRejectedValueOnce(new Error('Beds24 down'))
      .mockResolvedValueOnce({ userId: 'user-2', bookingsFound: 1, sent: 1, skipped: 0, failed: 0 })

    const response = await GET(request('Bearer test-cron-secret'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(processReviewRemindersForUser).toHaveBeenCalledTimes(2)
    expect(body.totalSent).toBe(1)
    expect(body.totalFailed).toBe(1)
  })
})
