import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { GET, POST } from './route'
import { resolvePropertyChannels } from '@/lib/pricing/resolvePropertyChannels'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
vi.mock('@/lib/pricing/resolvePropertyChannels', () => ({
  resolvePropertyChannels: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { onboarding_state: {} },
          }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
  })),
}))

describe('GET /api/dashboard/price-check/channel-urls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthorized request with 401', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/dashboard/price-check/channel-urls')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns resolved property channels for authenticated user', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-1', propertyId: '306559', roomId: '638851' },
    } as never)

    vi.mocked(resolvePropertyChannels).mockResolvedValue({
      urls: {
        airbnb: '12345678',
        booking: 'mountain-view-dafna',
        direct: 'nof-harim-dafna',
      },
      propertyName: 'נוף הרים בדפנה',
      isAutoDetected: { airbnb: true, booking: true, direct: true },
    })

    const req = new NextRequest('http://localhost/api/dashboard/price-check/channel-urls')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.urls.airbnb).toBe('12345678')
    expect(json.propertyName).toBe('נוף הרים בדפנה')
    expect(json.isAutoDetected.airbnb).toBe(true)
  })
})

describe('POST /api/dashboard/price-check/channel-urls', () => {
  it('saves channels and persists to user onboarding_state', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-1' },
    } as never)

    const req = new NextRequest('http://localhost/api/dashboard/price-check/channel-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        airbnb: '98765432',
        booking: 'my-hotel',
        direct: 'my-site',
        roomId: '638851',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.urls.airbnb).toBe('98765432')
  })
})
