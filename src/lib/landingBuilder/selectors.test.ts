import { describe, expect, it } from 'vitest'
import { builderReducer, createInitialDraft, createInitialState } from './draftReducer'
import { DEMO_PROPERTY } from './demoProperty'
import { PREVIEW_PLACEHOLDERS, buildPreviewModel, getCoverImage, isStepComplete } from './selectors'

const importedDraft = () =>
  builderReducer(createInitialState(), { type: 'property/imported', property: DEMO_PROPERTY }).draft

describe('buildPreviewModel', () => {
  it('renders placeholders and the default template for an empty draft', () => {
    const model = buildPreviewModel(createInitialDraft())
    expect(model.isPlaceholder).toBe(true)
    expect(model.templateId).toBe('minimalist-modern')
    expect(model.heroTitle).toBe(PREVIEW_PLACEHOLDERS.heroTitle)
    expect(model.amenities).toEqual(PREVIEW_PLACEHOLDERS.amenities)
    expect(model.coverImage).toBeNull()
    expect(model.galleryImages).toEqual([])
  })

  it('uses draft content and excludes the cover from the gallery', () => {
    const draft = importedDraft()
    const model = buildPreviewModel(draft)
    expect(model.isPlaceholder).toBe(false)
    expect(model.heroTitle).toBe(DEMO_PROPERTY.name)
    expect(model.coverImage?.id).toBe(draft.coverImageId)
    expect(model.galleryImages).toHaveLength(draft.images.length - 1)
    expect(model.galleryImages.some((image) => image.id === draft.coverImageId)).toBe(false)
  })

  it('falls back per-field when only some content is filled', () => {
    const draft = { ...createInitialDraft(), content: { ...createInitialDraft().content, heroTitle: 'רק כותרת' } }
    const model = buildPreviewModel(draft)
    expect(model.heroTitle).toBe('רק כותרת')
    expect(model.heroSubtitle).toBe(PREVIEW_PLACEHOLDERS.heroSubtitle)
    expect(model.isPlaceholder).toBe(false)
  })
})

describe('getCoverImage', () => {
  it('falls back to the first image when the cover id is stale', () => {
    const draft = { ...importedDraft(), coverImageId: 'gone' }
    expect(getCoverImage(draft)?.id).toBe(draft.images[0].id)
  })
})

describe('isStepComplete', () => {
  it('reports nothing complete for a fresh draft', () => {
    const draft = createInitialDraft()
    expect(isStepComplete(draft, 'template')).toBe(false)
    expect(isStepComplete(draft, 'import')).toBe(false)
    expect(isStepComplete(draft, 'customize')).toBe(false)
  })

  it('completes import and customize after importing a property', () => {
    const draft = importedDraft()
    expect(isStepComplete(draft, 'import')).toBe(true)
    expect(isStepComplete(draft, 'customize')).toBe(true)
  })

  it('treats a whitespace-only hero title as incomplete', () => {
    const draft = importedDraft()
    expect(isStepComplete({ ...draft, content: { ...draft.content, heroTitle: '   ' } }, 'customize')).toBe(false)
  })

  it('completes the publish step only with a valid address', () => {
    expect(isStepComplete(createInitialDraft(), 'publish')).toBe(false)
    expect(isStepComplete({ ...createInitialDraft(), siteAddress: 'ab' }, 'publish')).toBe(false)
    expect(isStepComplete({ ...createInitialDraft(), siteAddress: 'dalit' }, 'publish')).toBe(true)
  })

  it('completes the template step once a template is chosen', () => {
    expect(isStepComplete({ ...createInitialDraft(), templateId: 'cozy-warm' }, 'template')).toBe(true)
  })
})
