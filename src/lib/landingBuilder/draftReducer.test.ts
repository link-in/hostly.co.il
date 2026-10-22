import { describe, expect, it } from 'vitest'
import { builderReducer, createInitialState, withDefaultContact, withDefaultSiteAddress, type BuilderState } from './draftReducer'
import { DEMO_PROPERTY } from './demoProperty'
import type { DraftImage } from './types'

const upload = (id: string): DraftImage => ({ id, url: `blob:${id}`, alt: id, source: 'upload' })

function importedState(): BuilderState {
  return builderReducer(createInitialState(), { type: 'property/imported', property: DEMO_PROPERTY })
}

describe('builderReducer — navigation & preview', () => {
  it('starts on the template step with an empty desktop preview', () => {
    const state = createInitialState()
    expect(state.activeStep).toBe('template')
    expect(state.previewDevice).toBe('desktop')
    expect(state.draft.templateId).toBeNull()
    expect(state.draft.contentOrigin).toBe('empty')
  })

  it('activates a step and switches preview device', () => {
    let state = builderReducer(createInitialState(), { type: 'step/activated', step: 'customize' })
    state = builderReducer(state, { type: 'preview/deviceChanged', device: 'mobile' })
    expect(state.activeStep).toBe('customize')
    expect(state.previewDevice).toBe('mobile')
  })

  it('resets everything back to the initial state', () => {
    const state = builderReducer(importedState(), { type: 'draft/reset' })
    expect(state).toEqual(createInitialState())
  })
})

describe('builderReducer — site address', () => {
  it('normalizes what the user types', () => {
    const state = builderReducer(createInitialState(), { type: 'site/addressChanged', address: 'Nof Harim_Dafna' })
    expect(state.draft.siteAddress).toBe('nof-harim-dafna')
  })

  it('suggests an address on import only when none is chosen', () => {
    expect(importedState().draft.siteAddress).not.toBe('')

    let state = builderReducer(createInitialState(), { type: 'site/addressChanged', address: 'dalit' })
    state = builderReducer(state, { type: 'property/imported', property: DEMO_PROPERTY })
    expect(state.draft.siteAddress).toBe('dalit')
  })

  it('fills a default address without overriding a chosen one', () => {
    const draft = createInitialState().draft
    expect(withDefaultSiteAddress(draft, 'dalit').siteAddress).toBe('dalit')
    expect(withDefaultSiteAddress({ ...draft, siteAddress: 'mine' }, 'dalit').siteAddress).toBe('mine')
    expect(withDefaultSiteAddress(draft, null)).toBe(draft)
  })
})

describe('builderReducer — contact', () => {
  const legacy = { whatsapp: '050-1234567', phone: '', email: 'host@example.com' }

  it('edits one contact field at a time', () => {
    const state = builderReducer(createInitialState(), { type: 'contact/edited', patch: { phone: '04-6901234' } })
    expect(state.draft.contact).toEqual({ whatsapp: '', phone: '04-6901234', email: '' })
  })

  it('seeds contact details only while none were entered', () => {
    const draft = createInitialState().draft
    expect(withDefaultContact(draft, legacy).contact).toEqual(legacy)
    const own = { ...draft, contact: { whatsapp: '', phone: '04-6901234', email: '' } }
    expect(withDefaultContact(own, legacy)).toBe(own)
    expect(withDefaultContact(draft, null)).toBe(draft)
  })
})

describe('builderReducer — template', () => {
  it('selects a template', () => {
    const state = builderReducer(createInitialState(), {
      type: 'template/selected',
      templateId: 'cozy-warm',
    })
    expect(state.draft.templateId).toBe('cozy-warm')
  })
})

describe('builderReducer — property import', () => {
  it('fills content, images, booking data and picks the first image as cover', () => {
    const { draft } = importedState()
    expect(draft.propertyId).toBe(DEMO_PROPERTY.propertyId)
    expect(draft.roomId).toBe(DEMO_PROPERTY.roomId)
    expect(draft.content.heroTitle).toBe(DEMO_PROPERTY.name)
    expect(draft.content.heroSubtitle).toBe(DEMO_PROPERTY.headline)
    expect(draft.content.amenities).toEqual(DEMO_PROPERTY.amenities)
    expect(draft.images).toHaveLength(DEMO_PROPERTY.images.length)
    expect(draft.images.every((image) => image.source === 'import')).toBe(true)
    expect(draft.coverImageId).toBe(draft.images[0].id)
    expect(draft.booking).toEqual({ basePrice: 950, currency: 'ILS', maxGuests: 2 })
    expect(draft.contentOrigin).toBe('import')
  })

  it('keeps manually uploaded images and replaces previously imported ones on re-import', () => {
    let state = builderReducer(createInitialState(), { type: 'images/added', images: [upload('u1')] })
    state = builderReducer(state, { type: 'property/imported', property: DEMO_PROPERTY })
    state = builderReducer(state, { type: 'property/imported', property: DEMO_PROPERTY })

    const uploads = state.draft.images.filter((image) => image.source === 'upload')
    expect(uploads.map((image) => image.id)).toEqual(['u1'])
    expect(state.draft.images).toHaveLength(DEMO_PROPERTY.images.length + 1)
  })

  it('does not alias the imported amenities array', () => {
    const { draft } = importedState()
    expect(draft.content.amenities).not.toBe(DEMO_PROPERTY.amenities)
  })
})

describe('builderReducer — manual edits', () => {
  it('merges a content patch and marks the draft as manually edited', () => {
    const state = builderReducer(importedState(), {
      type: 'content/edited',
      patch: { heroTitle: 'כותרת חדשה' },
    })
    expect(state.draft.content.heroTitle).toBe('כותרת חדשה')
    expect(state.draft.content.heroSubtitle).toBe(DEMO_PROPERTY.headline)
    expect(state.draft.contentOrigin).toBe('manual')
  })

  it('uses the first uploaded image as cover when there is none yet', () => {
    const state = builderReducer(createInitialState(), {
      type: 'images/added',
      images: [upload('u1'), upload('u2')],
    })
    expect(state.draft.coverImageId).toBe('u1')
  })

  it('keeps the existing cover when more images are added', () => {
    const before = importedState()
    const state = builderReducer(before, { type: 'images/added', images: [upload('u1')] })
    expect(state.draft.coverImageId).toBe(before.draft.coverImageId)
  })

  it('selects a cover only from images that exist in the draft', () => {
    const before = importedState()
    const target = before.draft.images[2].id
    expect(
      builderReducer(before, { type: 'images/coverSelected', imageId: target }).draft.coverImageId,
    ).toBe(target)
    expect(
      builderReducer(before, { type: 'images/coverSelected', imageId: 'missing' }).draft,
    ).toBe(before.draft)
  })

  it('swaps persisted image URLs without touching ids or the cover', () => {
    const before = importedState()
    const [first] = before.draft.images
    const url = 'https://x.supabase.co/storage/v1/object/public/landing-images/u/site-builder/a.jpg'
    const state = builderReducer(before, { type: 'images/persisted', urls: { [first.id]: url } })
    expect(state.draft.images[0]).toEqual({ ...first, url })
    expect(state.draft.coverImageId).toBe(before.draft.coverImageId)
  })

  it('falls back to the next image when the cover is removed', () => {
    const before = importedState()
    const [cover, next] = before.draft.images
    const state = builderReducer(before, { type: 'images/removed', imageId: cover.id })
    expect(state.draft.images.some((image) => image.id === cover.id)).toBe(false)
    expect(state.draft.coverImageId).toBe(next.id)
  })

  it('clears the cover when the last image is removed', () => {
    let state = builderReducer(createInitialState(), { type: 'images/added', images: [upload('u1')] })
    state = builderReducer(state, { type: 'images/removed', imageId: 'u1' })
    expect(state.draft.coverImageId).toBeNull()
  })
})

describe('builderReducer — AI generation', () => {
  it('applies generated copy, template and cover image', () => {
    const before = importedState()
    const coverImageId = before.draft.images[3].id
    const state = builderReducer(before, {
      type: 'content/generated',
      generated: {
        templateId: 'cozy-warm',
        heroTitle: 'בריחה מושלמת לצפון',
        heroSubtitle: 'ג׳קוזי, נוף ושקט',
        description: 'תיאור שנוצר',
        coverImageId,
      },
    })
    expect(state.draft.templateId).toBe('cozy-warm')
    expect(state.draft.content.heroTitle).toBe('בריחה מושלמת לצפון')
    expect(state.draft.content.amenities).toEqual(DEMO_PROPERTY.amenities)
    expect(state.draft.coverImageId).toBe(coverImageId)
    expect(state.draft.contentOrigin).toBe('ai')
  })

  it('ignores a generated cover id that is not in the draft', () => {
    const before = importedState()
    const state = builderReducer(before, {
      type: 'content/generated',
      generated: {
        templateId: 'minimalist-modern',
        heroTitle: 'x',
        heroSubtitle: '',
        description: '',
        coverImageId: 'hallucinated-id',
      },
    })
    expect(state.draft.coverImageId).toBe(before.draft.coverImageId)
  })
})
