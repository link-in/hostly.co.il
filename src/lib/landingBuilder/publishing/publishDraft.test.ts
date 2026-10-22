import { describe, expect, it, vi } from 'vitest'
import { createInitialDraft } from '../draftReducer'
import type { LandingDraft } from '../types'
import { publishDraft, PUBLISH_ERRORS, type PublishDeps } from './publishDraft'
import { PUBLISH_BLOCKER_MESSAGES } from './publishBlockers'

const PUBLISHED_AT = '2026-10-22T11:00:00.000Z'

const draft: LandingDraft = {
  ...createInitialDraft(),
  propertyId: '123',
  templateId: 'cozy-warm',
  content: { siteTitle: 'נוף הרים', heroTitle: 'נוף הרים בדפנה', heroSubtitle: '', description: '', amenities: [], city: '' },
  images: [{ id: 'a', url: 'https://media.xmlcal.com/pic/a.png', alt: '', source: 'import' }],
  coverImageId: 'a',
  siteAddress: 'nof-harim-dafna',
  contact: { whatsapp: '', phone: '050-1234567', email: '' },
}

class TakenError extends Error {}

function makeDeps(overrides: Partial<PublishDeps> = {}): PublishDeps {
  return {
    checkAddress: vi.fn(async () => ({ status: 'available' as const, message: '' })),
    saveDraft: vi.fn(async () => PUBLISHED_AT),
    publishSite: vi.fn(async () => PUBLISHED_AT),
    isAddressTakenError: (error) => error instanceof TakenError,
    ...overrides,
  }
}

describe('publishDraft', () => {
  it('saves and publishes a ready draft', async () => {
    const deps = makeDeps()
    expect(await publishDraft(draft, '123', deps)).toEqual({ ok: true, address: 'nof-harim-dafna', publishedAt: PUBLISHED_AT })
    expect(deps.saveDraft).toHaveBeenCalledWith(draft)
    expect(deps.publishSite).toHaveBeenCalledWith(draft)
  })

  it('rejects malformed input and local images before touching storage', async () => {
    const deps = makeDeps()
    expect(await publishDraft({ nope: true }, '123', deps)).toEqual({ ok: false, error: PUBLISH_ERRORS.invalid })
    const local = { ...draft, images: [{ ...draft.images[0], url: 'blob:http://localhost/1' }] }
    expect(await publishDraft(local, '123', deps)).toEqual({ ok: false, error: PUBLISH_ERRORS.invalid })
    expect(deps.checkAddress).not.toHaveBeenCalled()
  })

  it("refuses another user's property", async () => {
    expect(await publishDraft(draft, '999', makeDeps())).toEqual({ ok: false, error: PUBLISH_ERRORS.foreignProperty })
  })

  it('reports the first blocker', async () => {
    const result = await publishDraft({ ...draft, contact: { whatsapp: '', phone: '', email: '' } }, '123', makeDeps())
    expect(result).toEqual({ ok: false, error: PUBLISH_BLOCKER_MESSAGES.contact })
  })

  it("does not take someone else's address", async () => {
    const deps = makeDeps({ checkAddress: async () => ({ status: 'taken', message: 'תפוסה' }) })
    expect(await publishDraft(draft, '123', deps)).toEqual({ ok: false, error: 'תפוסה' })
    expect(deps.publishSite).not.toHaveBeenCalled()
  })

  it('maps a lost race for the address and hides other storage errors', async () => {
    expect(await publishDraft(draft, '123', makeDeps({ publishSite: async () => Promise.reject(new TakenError()) }))).toEqual({
      ok: false,
      error: PUBLISH_ERRORS.taken,
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await publishDraft(draft, '123', makeDeps({ saveDraft: async () => Promise.reject(new Error('db down')) }))).toEqual({
      ok: false,
      error: PUBLISH_ERRORS.failed,
    })
  })
})
