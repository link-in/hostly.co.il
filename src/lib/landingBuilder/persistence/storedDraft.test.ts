import { describe, expect, it } from 'vitest'
import { createInitialDraft } from '../draftReducer'
import type { DraftImage, LandingDraft } from '../types'
import {
  belongsToProperty,
  draftFingerprint,
  getLocalImages,
  parseStoredDraft,
  replaceImageUrls,
  storedDraftSchema,
} from './storedDraft'

const hosted: DraftImage = { id: 'a', url: 'https://media.xmlcal.com/pic/p0030/6559/01.png', alt: '', source: 'import' }
const local: DraftImage = { id: 'b', url: 'blob:http://localhost:3005/123', alt: 'x.jpg', source: 'upload' }

const draftWith = (images: DraftImage[], overrides: Partial<LandingDraft> = {}): LandingDraft => ({
  ...createInitialDraft(),
  images,
  ...overrides,
})

describe('storedDraftSchema', () => {
  it('accepts a draft with hosted images only', () => {
    expect(storedDraftSchema.safeParse(draftWith([hosted])).success).toBe(true)
  })

  it('rejects local blob: and non-https images', () => {
    expect(storedDraftSchema.safeParse(draftWith([local])).success).toBe(false)
    expect(storedDraftSchema.safeParse(draftWith([{ ...hosted, url: 'http://example.com/a.png' }])).success).toBe(false)
  })
})

describe('parseStoredDraft', () => {
  it('loads drafts saved before the site address existed', () => {
    const { siteAddress: _omitted, ...legacy } = draftWith([hosted])
    expect(parseStoredDraft(legacy)?.siteAddress).toBe('')
  })

  it('returns null for JSON that no longer matches the schema', () => {
    expect(parseStoredDraft({ templateId: 'unknown' })).toBeNull()
    expect(parseStoredDraft(draftWith([hosted]))?.images).toEqual([hosted])
  })
})

describe('getLocalImages / replaceImageUrls', () => {
  it('finds local previews and swaps them for hosted URLs by id', () => {
    const draft = draftWith([hosted, local])
    expect(getLocalImages(draft)).toEqual([local])

    const replaced = replaceImageUrls(draft, { b: 'https://x.supabase.co/storage/v1/object/public/landing-images/u/b.jpg' })
    expect(replaced.images.map((image) => image.url)).toEqual([
      hosted.url,
      'https://x.supabase.co/storage/v1/object/public/landing-images/u/b.jpg',
    ])
    expect(replaceImageUrls(draft, {})).toBe(draft)
  })
})

describe('belongsToProperty', () => {
  it("allows the session's property or no property yet", () => {
    expect(belongsToProperty(draftWith([], { propertyId: '306559' }), '306559')).toBe(true)
    expect(belongsToProperty(draftWith([], { propertyId: null }), '306559')).toBe(true)
    expect(belongsToProperty(draftWith([], { propertyId: '111111' }), '306559')).toBe(false)
  })
})

describe('draftFingerprint', () => {
  it('changes when the content changes', () => {
    const draft = draftWith([hosted])
    expect(draftFingerprint(draft)).toBe(draftFingerprint({ ...draft }))
    expect(draftFingerprint(draft)).not.toBe(draftFingerprint({ ...draft, coverImageId: 'a' }))
  })
})
