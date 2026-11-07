/**
 * Tests for the manual cache-refresh route (the "סנכרון מול Beds24" button).
 * Beds24 and Supabase are fully mocked - no network access.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { refreshRoomCache } from '@/lib/availability/cache'
import { createFakeSupabaseClient, type FakeSupabaseClient } from '@/__tests__/helpers/fakeSupabase'
import { POST } from './route'

let fakeClient: FakeSupabaseClient

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
vi.mock('@/lib/availability/cache', () => ({ refreshRoomCache: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => fakeClient,
}))

function seedUser(overrides: Record<string, unknown> = {}) {
  fakeClient = createFakeSupabaseClient({
    users: [
      {
        id: 'user-1',
        room_id: '111:Room A,222:Room B',
        property_id: '999',
        beds24_token: 'access',
        beds24_refresh_token: 'refresh',
        ...overrides,
      },
    ],
  })
}

function postRequest(body?: unknown) {
  return new NextRequest('http://localhost/api/dashboard/cache/refresh', {
    method: 'POST',
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
  })
}

describe('POST /api/dashboard/cache/refresh', () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never)
    vi.mocked(refreshRoomCache).mockReset()
    vi.mocked(refreshRoomCache).mockResolvedValue({ upserted: 365 })
    seedUser()
  })

  it('rejects unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await POST(postRequest({}))
    expect(res.status).toBe(401)
    expect(refreshRoomCache).not.toHaveBeenCalled()
  })

  it('refreshes every room of the user when no roomId is given, for 12 months', async () => {
    const res = await POST(postRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.totalDays).toBe(730)
    expect(vi.mocked(refreshRoomCache).mock.calls.map((c) => c[2])).toEqual(['111', '222'])
    expect(vi.mocked(refreshRoomCache).mock.calls[0][5]).toEqual({ months: 12 })
  })

  it('refreshes only the requested room when it belongs to the user', async () => {
    const res = await POST(postRequest({ roomId: 222 }))

    expect(res.status).toBe(200)
    expect(vi.mocked(refreshRoomCache).mock.calls.map((c) => c[2])).toEqual(['222'])
  })

  it('refuses a room that does not belong to the user', async () => {
    const res = await POST(postRequest({ roomId: '333' }))

    expect(res.status).toBe(403)
    expect(refreshRoomCache).not.toHaveBeenCalled()
  })

  it('rejects a malformed roomId', async () => {
    const res = await POST(postRequest({ roomId: 'abc' }))

    expect(res.status).toBe(400)
    expect(refreshRoomCache).not.toHaveBeenCalled()
  })

  it('returns 400 when the user has no rooms configured', async () => {
    seedUser({ room_id: null })
    const res = await POST(postRequest({}))

    expect(res.status).toBe(400)
  })

  it('reports a partial failure without hiding the rooms that succeeded', async () => {
    vi.mocked(refreshRoomCache)
      .mockResolvedValueOnce({ upserted: 365 })
      .mockResolvedValueOnce({ upserted: 0, error: 'Beds24 returned 401' })

    const res = await POST(postRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(false)
    expect(json.rooms).toEqual([
      { roomId: '111', upserted: 365 },
      { roomId: '222', upserted: 0, error: 'Beds24 returned 401' },
    ])
  })

  it('returns 502 when every room fails', async () => {
    vi.mocked(refreshRoomCache).mockResolvedValue({ upserted: 0, error: 'Beds24 returned 401' })

    const res = await POST(postRequest())

    expect(res.status).toBe(502)
    expect((await res.json()).error).toContain('111')
  })
})
