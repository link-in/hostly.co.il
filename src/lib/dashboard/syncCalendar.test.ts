import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { formatSyncSuccess, syncCalendarCache } from './syncCalendar'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

const okBody = {
  success: true,
  totalDays: 366,
  refreshedAt: '2026-11-07T19:00:00.000Z',
  rooms: [{ roomId: '638851', upserted: 366 }],
}

describe('syncCalendarCache', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends the roomId when given', async () => {
    fetchMock.mockResolvedValue(jsonResponse(okBody))
    await syncCalendarCache('638851')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/dashboard/cache/refresh')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ roomId: '638851' })
  })

  it('sends an empty body (all rooms) when no roomId is given', async () => {
    fetchMock.mockResolvedValue(jsonResponse(okBody))
    await syncCalendarCache()

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({})
  })

  it('returns the parsed result on success', async () => {
    fetchMock.mockResolvedValue(jsonResponse(okBody))

    await expect(syncCalendarCache('638851')).resolves.toMatchObject({ totalDays: 366 })
  })

  it('throws the server error message on an HTTP failure', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'No Beds24 token configured' }, 400))

    await expect(syncCalendarCache()).rejects.toThrow('No Beds24 token configured')
  })

  it('throws when a room failed even though the HTTP status was 200', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ ...okBody, success: false, rooms: [{ roomId: '638851', upserted: 0, error: 'boom' }] }),
    )

    await expect(syncCalendarCache()).rejects.toThrow('638851')
  })

  it('throws a generic error when the response shape is unexpected', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ unexpected: true }))

    await expect(syncCalendarCache()).rejects.toThrow('הסנכרון מול Beds24 נכשל')
  })
})

describe('formatSyncSuccess', () => {
  it('mentions the number of updated days', () => {
    expect(formatSyncSuccess({ ...okBody })).toContain('366')
  })
})
