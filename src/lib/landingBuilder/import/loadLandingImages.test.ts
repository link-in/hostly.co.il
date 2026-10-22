import { describe, expect, it } from 'vitest'
import { toPropertyImages } from './loadLandingImages'

const url = (name: string) => `https://example.supabase.co/storage/v1/object/public/landing-images/${name}.jpg`

describe('toPropertyImages', () => {
  it('orders hero images before the gallery, each by saved order', () => {
    const rows = [
      { public_url: url('p2'), section_type: 'portfolio', order_index: 2 },
      { public_url: url('h1'), section_type: 'hero', order_index: 1 },
      { public_url: url('p1'), section_type: 'portfolio', order_index: 1 },
      { public_url: url('h0'), section_type: 'hero', order_index: 0 },
    ]
    expect(toPropertyImages(rows, 'נכס').map((image) => image.url)).toEqual([url('h0'), url('h1'), url('p1'), url('p2')])
  })

  it('applies the alt text, skips invalid rows and dedupes URLs', () => {
    const rows = [
      { public_url: url('a'), section_type: 'hero', order_index: null },
      { public_url: url('a'), section_type: 'portfolio', order_index: 0 },
      { public_url: 'not-a-url', section_type: 'hero', order_index: 0 },
      { section_type: 'hero' },
    ]
    expect(toPropertyImages(rows, 'נכס')).toEqual([{ url: url('a'), alt: 'נכס' }])
  })
})
