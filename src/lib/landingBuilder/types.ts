import { z } from 'zod'

export const TEMPLATE_IDS = ['minimalist-modern', 'cozy-warm'] as const
export const templateIdSchema = z.enum(TEMPLATE_IDS)
export type TemplateId = z.infer<typeof templateIdSchema>

export const BUILDER_STEPS = ['template', 'import', 'customize'] as const
export type BuilderStep = (typeof BUILDER_STEPS)[number]

export type PreviewDevice = 'desktop' | 'mobile'

export const imageSourceSchema = z.enum(['import', 'upload'])
export type ImageSource = z.infer<typeof imageSourceSchema>

export const draftImageSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  alt: z.string(),
  source: imageSourceSchema,
})
export type DraftImage = z.infer<typeof draftImageSchema>

/**
 * Property content as cached from Beds24 (property + room texts, pictures, amenities).
 * The import server action must parse its Supabase/Beds24 payload through this schema.
 */
export const propertyContentSchema = z.object({
  propertyId: z.string().min(1),
  roomId: z.string().min(1).nullable(),
  name: z.string().min(1),
  headline: z.string(),
  description: z.string(),
  city: z.string(),
  amenities: z.array(z.string().min(1)),
  images: z.array(
    z.object({
      url: z.url(),
      alt: z.string(),
    }),
  ),
  maxGuests: z.number().int().positive().nullable(),
  basePrice: z.number().nonnegative().nullable(),
  currency: z.string().length(3),
})
export type PropertyContent = z.infer<typeof propertyContentSchema>

export const draftContentSchema = z.object({
  siteTitle: z.string().max(80),
  heroTitle: z.string().max(120),
  heroSubtitle: z.string().max(240),
  description: z.string().max(4000),
  amenities: z.array(z.string().min(1)).max(30),
  city: z.string().max(80),
})
export type DraftContent = z.infer<typeof draftContentSchema>

export const contentOriginSchema = z.enum(['empty', 'import', 'ai', 'manual'])
export type ContentOrigin = z.infer<typeof contentOriginSchema>

export const landingDraftSchema = z.object({
  propertyId: z.string().nullable(),
  roomId: z.string().nullable(),
  templateId: templateIdSchema.nullable(),
  content: draftContentSchema,
  images: z.array(draftImageSchema),
  coverImageId: z.string().nullable(),
  booking: z.object({
    basePrice: z.number().nonnegative().nullable(),
    currency: z.string().length(3),
    maxGuests: z.number().int().positive().nullable(),
  }),
  contentOrigin: contentOriginSchema,
})
export type LandingDraft = z.infer<typeof landingDraftSchema>

/** Output of the AI generation step (Phase 5) — applied to the draft as-is. */
export const generatedContentSchema = z.object({
  templateId: templateIdSchema,
  heroTitle: z.string().min(1).max(120),
  heroSubtitle: z.string().max(240),
  description: z.string().max(4000),
  coverImageId: z.string().nullable(),
})
export type GeneratedContent = z.infer<typeof generatedContentSchema>
