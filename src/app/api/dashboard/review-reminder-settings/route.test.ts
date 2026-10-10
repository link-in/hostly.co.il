import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getServerSession } from 'next-auth'
import { getUserById, updateUser } from '@/lib/auth/getUsersDb'
import { GET, POST } from './route'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
vi.mock('@/lib/auth/getUsersDb', () => ({
  getUserById: vi.fn(),
  updateUser: vi.fn(),
}))

function postRequest(body?: unknown): Request {
  return new Request('http://localhost/api/dashboard/review-reminder-settings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const TEST_USER = {
  id: 'user-1',
  email: 'host@example.com',
  displayName: 'Mountain View',
  googleReviewUrl: 'https://g.page/r/abc',
  reviewMessageText: 'תודה שהתארחתם אצלנו!',
  role: 'owner' as const,
  propertyId: '123',
  roomId: '456',
  passwordHash: null,
}

beforeEach(() => {
  vi.mocked(getServerSession).mockReset()
  vi.mocked(getUserById).mockReset()
  vi.mocked(updateUser).mockReset()
})

describe('GET /api/dashboard/review-reminder-settings', () => {
  it('rejects unauthenticated request', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as never)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns current settings for authenticated user', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: TEST_USER } as never)
    vi.mocked(getUserById).mockResolvedValue(TEST_USER)

    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toMatchObject({
      userId: 'user-1',
      googleReviewUrl: 'https://g.page/r/abc',
      reviewMessageText: 'תודה שהתארחתם אצלנו!',
    })
  })
})

describe('POST /api/dashboard/review-reminder-settings', () => {
  it('rejects unauthenticated request', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as never)
    const res = await POST(postRequest({}))
    expect(res.status).toBe(401)
  })

  it('allows demo users without updating DB', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { ...TEST_USER, isDemo: true },
    } as never)

    const res = await POST(postRequest({ reviewMessageText: 'טקסט דמו' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({ success: true, demo: true })
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('validates googleReviewUrl format', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: TEST_USER } as never)

    const res = await POST(postRequest({ googleReviewUrl: 'invalid-url' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('כתובת URL תקינה')
  })

  it('updates reviewMessageText and googleReviewUrl successfully', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: TEST_USER } as never)
    vi.mocked(updateUser).mockResolvedValue({
      ...TEST_USER,
      googleReviewUrl: 'https://g.page/r/new-link',
      reviewMessageText: 'נוסח חדש ומעודכן',
    })

    const res = await POST(
      postRequest({
        googleReviewUrl: 'https://g.page/r/new-link',
        reviewMessageText: 'נוסח חדש ומעודכן',
      }),
    )

    expect(res.status).toBe(200)
    expect(updateUser).toHaveBeenCalledWith('user-1', {
      googleReviewUrl: 'https://g.page/r/new-link',
      reviewMessageText: 'נוסח חדש ומעודכן',
    })

    const data = await res.json()
    expect(data).toMatchObject({
      success: true,
      settings: {
        googleReviewUrl: 'https://g.page/r/new-link',
        reviewMessageText: 'נוסח חדש ומעודכן',
      },
    })
  })
})
