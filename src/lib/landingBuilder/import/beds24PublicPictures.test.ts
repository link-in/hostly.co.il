import { describe, expect, it, vi } from 'vitest'
import { buildPublicPictureUrl, findPublicPictures } from './beds24PublicPictures'

describe('buildPublicPictureUrl', () => {
  it('splits the zero-padded property id into the media path', () => {
    expect(buildPublicPictureUrl('306559', 1)).toBe('https://media.xmlcal.com/pic/p0030/6559/01.png')
    expect(buildPublicPictureUrl('12345678', 12)).toBe('https://media.xmlcal.com/pic/p1234/5678/12.png')
  })

  it('rejects ids and positions that cannot map to a picture', () => {
    expect(buildPublicPictureUrl('DEMO_999999', 1)).toBeNull()
    expect(buildPublicPictureUrl('123456789', 1)).toBeNull()
    expect(buildPublicPictureUrl('306559', 0)).toBeNull()
    expect(buildPublicPictureUrl('306559', 100)).toBeNull()
  })
})

describe('findPublicPictures', () => {
  it('returns existing pictures in file order, skipping gaps', async () => {
    const existing = new Set(['01', '02', '05'])
    const exists = vi.fn(async (url: string) => existing.has(url.slice(-6, -4)))

    const images = await findPublicPictures('306559', 'נוף הרים', exists, 6)

    expect(exists).toHaveBeenCalledTimes(6)
    expect(images).toEqual([
      { url: 'https://media.xmlcal.com/pic/p0030/6559/01.png', alt: 'נוף הרים' },
      { url: 'https://media.xmlcal.com/pic/p0030/6559/02.png', alt: 'נוף הרים' },
      { url: 'https://media.xmlcal.com/pic/p0030/6559/05.png', alt: 'נוף הרים' },
    ])
  })

  it('treats a failed probe as a missing picture', async () => {
    const exists = vi.fn(async (url: string) => {
      if (url.endsWith('02.png')) throw new Error('timeout')
      return true
    })
    const images = await findPublicPictures('306559', '', exists, 2)
    expect(images.map((image) => image.url)).toEqual(['https://media.xmlcal.com/pic/p0030/6559/01.png'])
  })

  it('does not probe anything for an invalid property id', async () => {
    const exists = vi.fn(async () => true)
    expect(await findPublicPictures('abc', '', exists)).toEqual([])
    expect(exists).not.toHaveBeenCalled()
  })
})
