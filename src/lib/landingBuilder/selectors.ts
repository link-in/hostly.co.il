import { validateSiteAddress } from './siteAddress'
import { DEFAULT_TEMPLATE_ID } from './templates'
import type { BuilderStep, DraftImage, LandingDraft, TemplateId } from './types'

export interface PreviewModel {
  templateId: TemplateId
  siteTitle: string
  heroTitle: string
  heroSubtitle: string
  description: string
  city: string
  amenities: string[]
  coverImage: DraftImage | null
  galleryImages: DraftImage[]
  booking: LandingDraft['booking']
  isPlaceholder: boolean
}

export const PREVIEW_PLACEHOLDERS = {
  siteTitle: 'שם הנכס שלכם',
  heroTitle: 'החופשה המושלמת מתחילה כאן',
  heroSubtitle: 'ייבאו את נתוני הנכס או כתבו טקסט משלכם — התצוגה תתעדכן מיד',
  description: 'כאן יופיע תיאור הנכס: מה מחכה לאורחים, מה יש בסביבה ולמה כדאי להזמין ישירות.',
  amenities: ['Wi-Fi', 'חניה פרטית', 'מטבח מאובזר', 'מיזוג אוויר'],
} as const

export function getCoverImage(draft: LandingDraft): DraftImage | null {
  return draft.images.find((image) => image.id === draft.coverImageId) ?? draft.images[0] ?? null
}

function isDraftEmpty(draft: LandingDraft): boolean {
  const { siteTitle, heroTitle, description } = draft.content
  return !siteTitle && !heroTitle && !description && draft.images.length === 0
}

export function buildPreviewModel(draft: LandingDraft): PreviewModel {
  const coverImage = getCoverImage(draft)
  const { content } = draft

  return {
    templateId: draft.templateId ?? DEFAULT_TEMPLATE_ID,
    siteTitle: content.siteTitle || PREVIEW_PLACEHOLDERS.siteTitle,
    heroTitle: content.heroTitle || PREVIEW_PLACEHOLDERS.heroTitle,
    heroSubtitle: content.heroSubtitle || PREVIEW_PLACEHOLDERS.heroSubtitle,
    description: content.description || PREVIEW_PLACEHOLDERS.description,
    city: content.city,
    amenities: content.amenities.length > 0 ? content.amenities : [...PREVIEW_PLACEHOLDERS.amenities],
    coverImage,
    galleryImages: draft.images.filter((image) => image.id !== coverImage?.id),
    booking: draft.booking,
    isPlaceholder: isDraftEmpty(draft),
  }
}

export function isStepComplete(draft: LandingDraft, step: BuilderStep): boolean {
  switch (step) {
    case 'template':
      return draft.templateId !== null
    case 'import':
      return draft.propertyId !== null || draft.images.length > 0
    case 'customize':
      return draft.content.heroTitle.trim().length > 0 && getCoverImage(draft) !== null
    case 'publish':
      return validateSiteAddress(draft.siteAddress) === null
  }
}
