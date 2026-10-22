import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchBeds24V1Pictures } from './fetchBeds24V1Pictures'

const REQUEST = { propertyId: '306559', roomId: '638851', alt: 'נוף', apiKey: 'api-key', propKey: 'prop-key-1234567890' }
const PICTURE = 'https://media.xmlcal.com/pic/p0030/6559/01.png'

function mockFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe('fetchBeds24V1Pictures', () => {
  it('posts both keys and returns the room pictures', async () => {
    const fetchMock = mockFetch({
      getPropertyContent: [
        { propId: '306559', images: { hosted: { '1': { url: PICTURE, map: [{ propId: '306559', roomId: '638851', position: '1' }] } } } },
      ],
    })

    expect(await fetchBeds24V1Pictures(REQUEST)).toEqual([{ url: PICTURE, alt: 'נוף' }])
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({
      authentication: { apiKey: 'api-key', propKey: 'prop-key-1234567890' },
      images: true,
    })
  })

  it('rejects a propKey that belongs to another property', async () => {
    mockFetch({ getPropertyContent: [{ propId: '111111', images: {} }] })
    await expect(fetchBeds24V1Pictures(REQUEST)).rejects.toMatchObject({ code: 'not_found' })
  })

  it('treats Beds24 error payloads and HTTP errors as unavailable', async () => {
    mockFetch({ error: 'propKey must be at least 16 characters', errorCode: 2000 })
    await expect(fetchBeds24V1Pictures(REQUEST)).rejects.toMatchObject({ code: 'beds24_unavailable' })
    mockFetch({}, 500)
    await expect(fetchBeds24V1Pictures(REQUEST)).rejects.toMatchObject({ code: 'beds24_unavailable' })
  })
})
