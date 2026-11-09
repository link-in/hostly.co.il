import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { submitBulkPrices } from './bulkPriceClient'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

const calendar = [{ from: '2026-11-05', to: '2026-11-06', price1: 650 }]

describe('submitBulkPrices', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the calendar for the room, without touching availability', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ success: true }]))
    await submitBulkPrices('638851', calendar)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/dashboard/rooms')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual([{ roomId: 638851, calendar }])
  })

  it('refreshes the availability cache in the background after success', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ success: true }]))
    await submitBulkPrices('638851', calendar)

    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toBe('/api/dashboard/cache/refresh')
    expect(JSON.parse(init.body)).toEqual({ roomId: '638851' })
  })

  it('omits roomId and skips the cache refresh when no room is known', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ success: true }]))
    await submitBulkPrices(undefined, calendar)

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual([{ calendar }])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws the server error message when Beds24 rejects the update', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Beds24 דחתה את העדכון' }, 502))

    await expect(submitBulkPrices('638851', calendar)).rejects.toThrow('Beds24 דחתה את העדכון')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws when the response body reports a failure', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false, error: 'bad room' }))

    await expect(submitBulkPrices('638851', calendar)).rejects.toThrow('bad room')
  })
})
