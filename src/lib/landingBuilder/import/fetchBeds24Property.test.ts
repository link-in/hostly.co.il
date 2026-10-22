import { describe, expect, it } from 'vitest'
import { buildPropertyContentUrl } from './fetchBeds24Property'

describe('buildPropertyContentUrl', () => {
  it('requests one property with rooms, all texts and pictures', () => {
    const url = new URL(buildPropertyContentUrl('306559', 'https://api.beds24.com/v2'))
    expect(url.pathname).toBe('/v2/properties')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      id: '306559',
      includeAllRooms: 'true',
      includeTexts: 'all',
      includeLanguages: 'all',
      includePictures: 'true',
    })
  })
})
