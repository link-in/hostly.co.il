/**
 * Integration tests for the "manually trigger review reminders now" endpoint.
 * `next-auth` session and `processReviewRemindersForUser` are mocked — no real
 * Beds24/WhatsApp/DB call happens here.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getServerSession } from 'next-auth'
import { processReviewRemindersForUser } from '@/lib/reviewReminders/service'
import { getYesterdayInIsrael } from '@/lib/reviewReminders/dateUtils'
import { POST } from './route'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
vi.mock('@/lib/reviewReminders/service', () => ({ processReviewRemindersForUser: vi.fn() }))
vi.mock('@/lib/reviewReminders/dateUtils', () => ({ getYesterdayInIsrael: vi.fn() }))

function postRequest(body?: unknown): Request {
  return new Request('http://localhost/api/dashboard/review-reminders/send-now', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const TEST_SESSION_USER = {
  id: 'user-1',
  email: 'host@example.com',
  displayName: 'Mountain View',
  propertyId: '306559',
  googleReviewUrl: 'https://g.page/r/abc123',
  beds24Token: 'token',
  beds24RefreshToken: 'refresh',
  role: 'owner' as const,
  isDemo: false,
}

beforeEach(() => {
  vi.mocked(getServerSession).mockReset()
  vi.mocked(processReviewRemindersForUser).mockReset()
  vi.mocked(getYesterdayInIsrael).mockReturnValue('2026-07-10')
  vi.mocked(processReviewRemindersForUser).mockResolvedValue({
    userId: 'user-1',
    bookingsFound: 2,
    sent: 1,
    skipped: 1,
    failed: 0,
  })
})

describe('POST /api/dashboard/review-reminders/send-now', () => {
  it('rejects an unauthenticated request', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as never)
    const response = await POST(postRequest({}))
    expect(response.status).toBe(401)
    expect(processReviewRemindersForUser).not.toHaveBeenCalled()
  })

  it('rejects a demo user', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { ...TEST_SESSION_USER, isDemo: true },
    } as never)

    const response = await POST(postRequest({}))
    expect(response.status).toBe(403)
    expect(processReviewRemindersForUser).not.toHaveBeenCalled()
  })

  it('rejects a host with no Beds24 connection', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { ...TEST_SESSION_USER, beds24Token: undefined, beds24RefreshToken: undefined },
    } as never)

    const response = await POST(postRequest({}))
    expect(response.status).toBe(400)
    expect(processReviewRemindersForUser).not.toHaveBeenCalled()
  })

  it('still runs for a host with an access token but no refresh token (long-lived token, common case)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { ...TEST_SESSION_USER, beds24RefreshToken: undefined },
    } as never)

    const response = await POST(postRequest({}))
    expect(response.status).toBe(200)
    expect(processReviewRemindersForUser).toHaveBeenCalledWith(
      expect.objectContaining({ beds24Token: 'token', beds24RefreshToken: '' }),
      '2026-07-10',
    )
  })

  it('defaults to yesterday (Israel time) and forwards the session user', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: TEST_SESSION_USER } as never)

    const response = await POST(postRequest({}))
    expect(response.status).toBe(200)

    expect(processReviewRemindersForUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        propertyId: '306559',
        beds24Token: 'token',
        beds24RefreshToken: 'refresh',
        googleReviewUrl: 'https://g.page/r/abc123',
      }),
      '2026-07-10',
    )

    const body = await response.json()
    expect(body).toMatchObject({ success: true, date: '2026-07-10', sent: 1, skipped: 1, failed: 0, bookingsFound: 2 })
  })

  it('uses an explicit valid date instead of the default', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: TEST_SESSION_USER } as never)

    await POST(postRequest({ date: '2026-06-01' }))

    expect(processReviewRemindersForUser).toHaveBeenCalledWith(expect.anything(), '2026-06-01')
  })

  it('falls back to yesterday when given a malformed date', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: TEST_SESSION_USER } as never)

    await POST(postRequest({ date: 'not-a-date' }))

    expect(processReviewRemindersForUser).toHaveBeenCalledWith(expect.anything(), '2026-07-10')
  })
})
