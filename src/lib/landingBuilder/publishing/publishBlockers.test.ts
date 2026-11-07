import { describe, expect, it } from 'vitest'
import { createInitialDraft } from '../draftReducer'
import type { LandingDraft } from '../types'
import { getPublishBlockers } from './publishBlockers'

function readyDraft(overrides: Partial<LandingDraft> = {}): LandingDraft {
  return {
    ...createInitialDraft(),
    templateId: 'minimalist-modern',
    content: { siteTitle: 'נוף הרים', heroTitle: 'נוף הרים בדפנה', heroSubtitle: '', description: '', amenities: [], city: 'Dafna' },
    images: [{ id: 'a', url: 'https://media.xmlcal.com/pic/a.png', alt: '', source: 'import' }],
    coverImageId: 'a',
    siteAddress: 'nof-harim-dafna',
    contact: { whatsapp: '050-1234567', phone: '', email: '' },
    ...overrides,
  }
}

describe('getPublishBlockers', () => {
  it('passes a complete draft', () => {
    expect(getPublishBlockers(readyDraft())).toEqual([])
  })

  it('lists everything missing from an empty draft, in wizard order', () => {
    expect(getPublishBlockers(createInitialDraft())).toEqual(['template', 'title', 'coverImage', 'siteAddress', 'contact'])
  })

  it('blocks malformed contact details', () => {
    expect(getPublishBlockers(readyDraft({ contact: { whatsapp: '050-1234567', phone: '', email: 'zur@' } }))).toEqual([
      'contactInvalid',
    ])
  })

  it('blocks local images unless the client may still upload them', () => {
    const draft = readyDraft({ images: [{ id: 'a', url: 'blob:http://localhost/1', alt: '', source: 'upload' }] })
    expect(getPublishBlockers(draft)).toEqual(['unsavedImages'])
    expect(getPublishBlockers(draft, { allowLocalImages: true })).toEqual([])
  })
})
