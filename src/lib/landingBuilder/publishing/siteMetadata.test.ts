import { describe, expect, it } from 'vitest'
import { createInitialDraft } from '../draftReducer'
import { buildPublishedSiteMetadata } from './siteMetadata'

describe('buildPublishedSiteMetadata', () => {
  const draft = {
    ...createInitialDraft(),
    content: { siteTitle: 'נוף הרים', heroTitle: 'כותרת', heroSubtitle: '', description: 'א'.repeat(300), amenities: [], city: '' },
    images: [{ id: 'a', url: 'https://media.xmlcal.com/pic/a.png', alt: 'נוף', source: 'import' as const }],
    coverImageId: 'a',
    siteAddress: 'nof-harim-dafna',
  }

  it('uses the site title, canonical subdomain and cover image', () => {
    const metadata = buildPublishedSiteMetadata(draft)
    expect(metadata.title).toBe('נוף הרים')
    expect(metadata.alternates?.canonical).toBe('https://nof-harim-dafna.hostly.co.il')
    expect(metadata.openGraph?.images).toEqual([{ url: 'https://media.xmlcal.com/pic/a.png', alt: 'נוף' }])
  })

  it('falls back to the description, trimmed for search results', () => {
    expect(buildPublishedSiteMetadata(draft).description).toHaveLength(160)
  })
})
