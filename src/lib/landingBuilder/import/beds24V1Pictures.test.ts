import { describe, expect, it } from 'vitest'
import { beds24V1PropertyContentSchema, extractV1Pictures } from './beds24V1Pictures'

const url = (n: number) => `https://media.xmlcal.com/pic/p0030/6559/${String(n).padStart(2, '0')}.png`

/** Trimmed from the real V1 getPropertyContent response for property 306559. */
function content(hosted: Record<string, unknown>, external: Record<string, unknown> = { '1': { url: '', map: [] } }) {
  return beds24V1PropertyContentSchema.parse({ propId: '306559', images: { hosted, external } })
}

const both = (position: string) => [
  { propId: '306559', position },
  { propId: '306559', roomId: '638851', position },
]

describe('extractV1Pictures', () => {
  it('orders the room pictures by their room position', () => {
    const data = content({
      '1': { url: url(1), map: [{ propId: '306559', roomId: '638851', position: '2' }] },
      '2': { url: url(2), map: [{ propId: '306559', roomId: '638851', position: '1' }] },
    })
    expect(extractV1Pictures(data, '638851', 'alt').map((image) => image.url)).toEqual([url(2), url(1)])
  })

  it('uses property pictures when nothing is assigned to the room', () => {
    const data = content({
      '1': { url: url(1), map: [{ propId: '306559', position: '1' }] },
      '2': { url: url(2), map: [{ propId: '306559', roomId: '999', position: '1' }] },
    })
    expect(extractV1Pictures(data, '638851', 'alt')).toEqual([{ url: url(1), alt: 'alt' }])
  })

  it('falls back to unassigned pictures, skipping empty external slots', () => {
    const data = content({ '1': { url: url(1), map: [] } }, { '1': { url: '', map: [] }, '2': { url: 'https://cdn.example.com/a.jpg', map: [] } })
    expect(extractV1Pictures(data, null, '').map((image) => image.url)).toEqual([url(1), 'https://cdn.example.com/a.jpg'])
  })

  it('handles the real shape where each picture maps to the property and the room', () => {
    const data = content({ '1': { url: url(1), map: both('1') }, '2': { url: url(2), map: both('2') } })
    expect(extractV1Pictures(data, '638851', '').map((image) => image.url)).toEqual([url(1), url(2)])
  })

  it('ignores non-https URLs and tolerates a missing images block', () => {
    const data = content({ '1': { url: 'http://insecure.example.com/a.png', map: both('1') } })
    expect(extractV1Pictures(data, '638851', '')).toEqual([])
    expect(extractV1Pictures(beds24V1PropertyContentSchema.parse({ propId: '1' }), null, '')).toEqual([])
  })
})
