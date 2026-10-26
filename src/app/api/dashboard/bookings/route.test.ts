import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getServerSession } from 'next-auth'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import { PATCH } from './route'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
vi.mock('@/lib/beds24/tokenManager', () => ({ fetchWithTokenRefresh: vi.fn() }))
vi.mock('@/lib/beds24/creditGuard', () => ({ detectAndMarkCreditError: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
  }),
}))

describe('PATCH /api/dashboard/bookings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handles demo session by returning fake success without calling Beds24', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'user-demo',
        isDemo: true,
      },
    } as any)

    const request = new Request('http://localhost/api/dashboard/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: 'res_1002',
        cleaningCost: 300,
        hasCleaning: true,
        cleanerName: 'מרים',
      }),
    })

    const res = await PATCH(request)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.demo).toBe(true)
    expect(fetchWithTokenRefresh).not.toHaveBeenCalled()
  })

  it('updates cleaning cost on an Airbnb channel booking without sending dates or price', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'user-1',
        propertyId: '12345',
        roomId: '67890',
      },
    } as any)

    vi.mocked(fetchWithTokenRefresh).mockResolvedValueOnce(
      new Response(JSON.stringify([{ success: true, id: 98765 }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const request = new Request('http://localhost/api/dashboard/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: '98765',
        propertyId: '12345',
        roomId: '67890',
        cleaningCost: 280,
        hasCleaning: true,
        cleanerName: 'אולגה',
        notes: 'Guest arrived early',
        isChannelBooking: true,
      }),
    })

    const res = await PATCH(request)
    expect(res.status).toBe(200)

    expect(fetchWithTokenRefresh).toHaveBeenCalledTimes(1)
    const callArgs = vi.mocked(fetchWithTokenRefresh).mock.calls[0]
    const payload = JSON.parse(callArgs[1]?.body as string)

    expect(payload).toEqual([
      {
        id: '98765',
        propertyId: '12345',
        roomId: '67890',
        notes: 'Guest arrived early\n[עלות ניקיון: ₪280, מנקה: אולגה]',
        cleaningCost: 280,
        hasCleaning: true,
        cleanerName: 'אולגה',
      },
    ])
    expect(payload[0].arrival).toBeUndefined()
    expect(payload[0].departure).toBeUndefined()
    expect(payload[0].price).toBeUndefined()
  })

  it('replaces existing cleaning tag in notes when updating cleaner price and name', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'user-1',
        propertyId: '12345',
        roomId: '67890',
      },
    } as any)

    vi.mocked(fetchWithTokenRefresh).mockResolvedValueOnce(
      new Response(JSON.stringify([{ success: true, id: 98765 }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const request = new Request('http://localhost/api/dashboard/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: '98765',
        cleaningCost: 350,
        hasCleaning: true,
        cleanerName: 'דנה',
        notes: 'הערות קיימות\n[עלות ניקיון: ₪200, מנקה: דני]',
      }),
    })

    const res = await PATCH(request)
    expect(res.status).toBe(200)

    const callArgs = vi.mocked(fetchWithTokenRefresh).mock.calls[0]
    const payload = JSON.parse(callArgs[1]?.body as string)
    expect(payload[0].notes).toBe('הערות קיימות\n[עלות ניקיון: ₪350, מנקה: דנה]')
    expect(payload[0].cleaningCost).toBe(350)
    expect(payload[0].cleanerName).toBe('דנה')
  })

  it('removes cleaning tag from notes when cleaning is disabled', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'user-1',
        propertyId: '12345',
        roomId: '67890',
      },
    } as any)

    vi.mocked(fetchWithTokenRefresh).mockResolvedValueOnce(
      new Response(JSON.stringify([{ success: true, id: 98765 }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const request = new Request('http://localhost/api/dashboard/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: '98765',
        cleaningCost: 0,
        hasCleaning: false,
        notes: 'הערות קיימות\n[עלות ניקיון: ₪200, מנקה: דני]',
      }),
    })

    const res = await PATCH(request)
    expect(res.status).toBe(200)

    const callArgs = vi.mocked(fetchWithTokenRefresh).mock.calls[0]
    const payload = JSON.parse(callArgs[1]?.body as string)
    expect(payload[0].notes).toBe('הערות קיימות')
    expect(payload[0].cleaningCost).toBe(0)
    expect(payload[0].hasCleaning).toBe(false)
  })
})
