import { describe, expect, it, vi } from 'vitest'
import { findBeds24Pictures, type PictureSources } from './findBeds24Pictures'

const V1 = [{ url: 'https://media.xmlcal.com/pic/p0030/6559/02.png', alt: '' }]
const PUBLIC = [{ url: 'https://media.xmlcal.com/pic/p0030/6559/01.png', alt: '' }]

function sources(overrides: Partial<PictureSources> = {}): PictureSources {
  return {
    loadPropKey: vi.fn(async () => 'prop-key-1234567890'),
    fetchWithPropKey: vi.fn(async () => V1),
    probePublicUrls: vi.fn(async () => PUBLIC),
    ...overrides,
  }
}

describe('findBeds24Pictures', () => {
  it('uses the V1 API when the property has a propKey', async () => {
    const s = sources()
    expect(await findBeds24Pictures(s)).toEqual(V1)
    expect(s.fetchWithPropKey).toHaveBeenCalledWith('prop-key-1234567890')
    expect(s.probePublicUrls).not.toHaveBeenCalled()
  })

  it('probes public URLs when there is no propKey', async () => {
    const s = sources({ loadPropKey: vi.fn(async () => null) })
    expect(await findBeds24Pictures(s)).toEqual(PUBLIC)
    expect(s.fetchWithPropKey).not.toHaveBeenCalled()
  })

  it('falls back to public URLs when loading the key or calling V1 fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await findBeds24Pictures(sources({ loadPropKey: vi.fn(async () => Promise.reject(new Error('db'))) }))).toEqual(PUBLIC)
    expect(await findBeds24Pictures(sources({ fetchWithPropKey: vi.fn(async () => Promise.reject(new Error('v1'))) }))).toEqual(PUBLIC)
  })
})
