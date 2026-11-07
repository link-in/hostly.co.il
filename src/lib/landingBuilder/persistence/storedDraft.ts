import { z } from 'zod'
import { landingDraftSchema, type DraftImage, type LandingDraft } from '../types'

const httpsUrl = z.url({ protocol: /^https$/ })

/** A saved draft may only reference hosted images — never local `blob:` previews. */
export const storedDraftSchema = landingDraftSchema.extend({
  images: z.array(landingDraftSchema.shape.images.element.extend({ url: httpsUrl })).max(60),
})

export const isLocalImage = (image: DraftImage) => image.url.startsWith('blob:')

export function getLocalImages(draft: LandingDraft): DraftImage[] {
  return draft.images.filter(isLocalImage)
}

export function parseStoredDraft(value: unknown): LandingDraft | null {
  const parsed = storedDraftSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

/** A draft may only carry the session's own property (or none yet). */
export function belongsToProperty(draft: LandingDraft, sessionPropertyId: string | null | undefined): boolean {
  return draft.propertyId === null || draft.propertyId === sessionPropertyId
}

/** Swaps local preview URLs for their hosted copies (keyed by image id). */
export function replaceImageUrls(draft: LandingDraft, urls: Record<string, string>): LandingDraft {
  if (Object.keys(urls).length === 0) return draft
  return {
    ...draft,
    images: draft.images.map((image) => (urls[image.id] ? { ...image, url: urls[image.id] } : image)),
  }
}

/** Stable comparison key for "has the draft changed since it was saved". */
export function draftFingerprint(draft: LandingDraft): string {
  return JSON.stringify(draft)
}
