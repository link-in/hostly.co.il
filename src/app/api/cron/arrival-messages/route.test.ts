import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'

const CRON_SECRET = 'test-secret'

function makeRequest(authHeader?: string) {
  return new Request('https://example.com/api/cron/arrival-messages', {
    method: 'GET',
    headers: authHeader ? { authorization: authHeader } : {},
  })
}

vi.mock('@/lib/db/users', () => ({
  getUsersWithBeds24Access: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/arrivalMessages/service', () => ({
  processArrivalMessagesForUser: vi.fn().mockResolvedValue({
    userId: 'u1',
    bookingsFound: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  }),
}))

vi.mock('@/lib/reviewReminders/dateUtils', () => ({
  getDateStringInTimeZone: vi.fn().mockReturnValue('2026-09-06'),
}))

describe('/api/cron/arrival-messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
  })

  it('returns 401 when no Authorization header is provided', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 401 for wrong secret', async () => {
    const res = await GET(makeRequest('Bearer wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('returns 401 when CRON_SECRET env is not configured', async () => {
    delete process.env.CRON_SECRET
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(401)
  })

  it('returns 200 with summary when correctly authorized', async () => {
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('date', '2026-09-06')
    expect(body).toHaveProperty('totalSent')
  })
})
