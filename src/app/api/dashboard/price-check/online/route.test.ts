import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { POST } from './route'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/dashboard/price-check/online', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/dashboard/price-check/online', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated requests with 401', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await POST(makeRequest({ checkIn: '2026-08-01', checkOut: '2026-08-03' }))
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('rejects invalid or missing date parameters with 400', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-1', isDemo: false },
    } as never)

    const res = await POST(makeRequest({ checkIn: '', checkOut: '' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('נתוני הבקשה אינם תקינים')
  })

  it('returns simulated results for demo user with 1.21 multiplier', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'demo-user', isDemo: true },
    } as never)

    const res = await POST(
      makeRequest({
        checkIn: '2026-08-01',
        checkOut: '2026-08-03',
        numAdult: 2,
        numChild: 0,
        basePrice: 1000,
      })
    )

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.nights).toBe(2)
    expect(data.basePrice).toBe(1000)
    expect(data.channels).toHaveLength(3)

    const airbnb = data.channels.find((c: any) => c.channelKey === 'airbnb')
    const booking = data.channels.find((c: any) => c.channelKey === 'booking')
    const direct = data.channels.find((c: any) => c.channelKey === 'direct')

    expect(airbnb).toBeDefined()
    expect(airbnb.hostlyPrice).toBe(1210) // 1000 * 1.21
    expect(airbnb.onlinePrice).toBe(1210)
    expect(airbnb.matchStatus).toBe('matched')
    expect(airbnb.url).toContain('check_in=2026-08-01')

    expect(booking).toBeDefined()
    expect(booking.hostlyPrice).toBe(1210)
    expect(booking.onlinePrice).toBe(1210)
    expect(booking.matchStatus).toBe('matched')
    expect(booking.url).toContain('checkin=2026-08-01')

    expect(direct).toBeDefined()
    expect(direct.hostlyPrice).toBe(1000)
    expect(direct.onlinePrice).toBe(1000)
    expect(direct.matchStatus).toBe('matched')
  })

  it('scans real channels when custom URLs/IDs are provided', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'real-user', isDemo: false },
    } as never)

    const res = await POST(
      makeRequest({
        checkIn: '2026-08-01',
        checkOut: '2026-08-03',
        numAdult: 2,
        numChild: 0,
        basePrice: 1000,
        channels: {
          airbnb: '12345678',
          booking: 'custom-hotel',
          direct: 'custom-site',
        },
      })
    )

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.channels).toHaveLength(3)
    const airbnb = data.channels.find((c: any) => c.channelKey === 'airbnb')
    expect(airbnb.url).toContain('rooms/12345678')
    expect(airbnb.url).toContain('check_in=2026-08-01')
  })
})
