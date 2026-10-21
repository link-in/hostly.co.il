import type {
  BuilderStep,
  DraftContent,
  DraftImage,
  GeneratedContent,
  LandingDraft,
  PreviewDevice,
  PropertyContent,
  TemplateId,
} from './types'

export interface BuilderState {
  draft: LandingDraft
  activeStep: BuilderStep
  previewDevice: PreviewDevice
}

export type BuilderAction =
  | { type: 'template/selected'; templateId: TemplateId }
  | { type: 'step/activated'; step: BuilderStep }
  | { type: 'preview/deviceChanged'; device: PreviewDevice }
  | { type: 'property/imported'; property: PropertyContent }
  | { type: 'content/edited'; patch: Partial<DraftContent> }
  | { type: 'content/generated'; generated: GeneratedContent }
  | { type: 'images/added'; images: DraftImage[] }
  | { type: 'images/removed'; imageId: string }
  | { type: 'images/coverSelected'; imageId: string }
  | { type: 'draft/reset' }

export const EMPTY_CONTENT: DraftContent = {
  siteTitle: '',
  heroTitle: '',
  heroSubtitle: '',
  description: '',
  amenities: [],
  city: '',
}

export function createInitialDraft(): LandingDraft {
  return {
    propertyId: null,
    roomId: null,
    templateId: null,
    content: { ...EMPTY_CONTENT, amenities: [] },
    images: [],
    coverImageId: null,
    booking: { basePrice: null, currency: 'ILS', maxGuests: null },
    contentOrigin: 'empty',
  }
}

export function createInitialState(draft: LandingDraft = createInitialDraft()): BuilderState {
  return { draft, activeStep: 'template', previewDevice: 'desktop' }
}

function toImportedImages(property: PropertyContent): DraftImage[] {
  return property.images.map((image, index) => ({
    id: `import-${property.propertyId}-${index}`,
    url: image.url,
    alt: image.alt || property.name,
    source: 'import',
  }))
}

function applyImportedProperty(draft: LandingDraft, property: PropertyContent): LandingDraft {
  const importedImages = toImportedImages(property)
  const uploadedImages = draft.images.filter((image) => image.source === 'upload')
  const images = [...importedImages, ...uploadedImages]

  return {
    ...draft,
    propertyId: property.propertyId,
    roomId: property.roomId,
    content: {
      siteTitle: property.name,
      heroTitle: property.name,
      heroSubtitle: property.headline,
      description: property.description,
      amenities: [...property.amenities],
      city: property.city,
    },
    images,
    coverImageId: images[0]?.id ?? null,
    booking: {
      basePrice: property.basePrice,
      currency: property.currency,
      maxGuests: property.maxGuests,
    },
    contentOrigin: 'import',
  }
}

function applyGeneratedContent(draft: LandingDraft, generated: GeneratedContent): LandingDraft {
  const coverExists = draft.images.some((image) => image.id === generated.coverImageId)

  return {
    ...draft,
    templateId: generated.templateId,
    content: {
      ...draft.content,
      heroTitle: generated.heroTitle,
      heroSubtitle: generated.heroSubtitle,
      description: generated.description,
    },
    coverImageId: coverExists ? generated.coverImageId : draft.coverImageId,
    contentOrigin: 'ai',
  }
}

function removeImage(draft: LandingDraft, imageId: string): LandingDraft {
  const images = draft.images.filter((image) => image.id !== imageId)
  const coverImageId =
    draft.coverImageId === imageId ? (images[0]?.id ?? null) : draft.coverImageId
  return { ...draft, images, coverImageId }
}

function addImages(draft: LandingDraft, added: DraftImage[]): LandingDraft {
  const images = [...draft.images, ...added]
  return { ...draft, images, coverImageId: draft.coverImageId ?? images[0]?.id ?? null }
}

function reduceDraft(draft: LandingDraft, action: BuilderAction): LandingDraft {
  switch (action.type) {
    case 'template/selected':
      return { ...draft, templateId: action.templateId }
    case 'property/imported':
      return applyImportedProperty(draft, action.property)
    case 'content/edited':
      return { ...draft, content: { ...draft.content, ...action.patch }, contentOrigin: 'manual' }
    case 'content/generated':
      return applyGeneratedContent(draft, action.generated)
    case 'images/added':
      return addImages(draft, action.images)
    case 'images/removed':
      return removeImage(draft, action.imageId)
    case 'images/coverSelected':
      return draft.images.some((image) => image.id === action.imageId)
        ? { ...draft, coverImageId: action.imageId }
        : draft
    default:
      return draft
  }
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'step/activated':
      return { ...state, activeStep: action.step }
    case 'preview/deviceChanged':
      return { ...state, previewDevice: action.device }
    case 'draft/reset':
      return createInitialState()
    default:
      return { ...state, draft: reduceDraft(state.draft, action) }
  }
}
