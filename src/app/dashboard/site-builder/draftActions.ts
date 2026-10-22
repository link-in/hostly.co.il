'use server'

import { z } from 'zod'
import { saveDraft } from '@/lib/landingBuilder/persistence/draftRepository'
import { imageUploadRequestSchema, MAX_UPLOAD_BYTES } from '@/lib/landingBuilder/persistence/imageUpload'
import { publishSite, SiteAddressTakenError } from '@/lib/landingBuilder/persistence/publishedSiteRepository'
import { signImageUpload, type SignedImageUpload } from '@/lib/landingBuilder/persistence/signImageUpload'
import { findSiteAddressOwner } from '@/lib/landingBuilder/persistence/siteAddressRepository'
import { belongsToProperty, storedDraftSchema } from '@/lib/landingBuilder/persistence/storedDraft'
import { publishDraft, type PublishResult } from '@/lib/landingBuilder/publishing/publishDraft'
import { checkSiteAddress, type SiteAddressCheck } from '@/lib/landingBuilder/siteAddressAvailability'
import { getEditor } from './editorSession'

export type SaveDraftResult = { ok: true; savedAt: string } | { ok: false; error: string }
export type SignUploadResult = ({ ok: true } & SignedImageUpload) | { ok: false; error: string }

const ERRORS = {
  invalid: 'לא ניתן לשמור: חלק מהנתונים אינם תקינים.',
  foreignProperty: 'הטיוטה שייכת לנכס אחר.',
  saveFailed: 'השמירה נכשלה. נסו שוב בעוד רגע.',
  imageType: `אפשר להעלות רק תמונות JPG, PNG, WebP, GIF או AVIF עד ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.`,
  uploadFailed: 'העלאת התמונה נכשלה. נסו שוב בעוד רגע.',
} as const

export async function saveDraftAction(input: unknown): Promise<SaveDraftResult> {
  const editor = await getEditor()
  if ('error' in editor) return { ok: false, error: editor.error }

  const parsed = storedDraftSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: ERRORS.invalid }
  if (!belongsToProperty(parsed.data, editor.user.propertyId)) return { ok: false, error: ERRORS.foreignProperty }

  try {
    return { ok: true, savedAt: await saveDraft(editor.user.id, parsed.data) }
  } catch (error) {
    console.error('[landing-builder] Saving draft failed:', error)
    return { ok: false, error: ERRORS.saveFailed }
  }
}

export async function publishSiteAction(input: unknown): Promise<PublishResult> {
  const editor = await getEditor()
  if ('error' in editor) return { ok: false, error: editor.error }
  const userId = editor.user.id

  return publishDraft(input, editor.user.propertyId, {
    checkAddress: (address) => checkSiteAddress(address, userId, findSiteAddressOwner),
    saveDraft: (draft) => saveDraft(userId, draft),
    publishSite: (draft) => publishSite(userId, draft),
    isAddressTakenError: (error) => error instanceof SiteAddressTakenError,
  })
}

const siteAddressInputSchema = z.string().max(64)

export async function checkSiteAddressAction(input: unknown): Promise<SiteAddressCheck | null> {
  const editor = await getEditor()
  const parsed = siteAddressInputSchema.safeParse(input)
  if ('error' in editor || !parsed.success) return null

  try {
    return await checkSiteAddress(parsed.data, editor.user.id, findSiteAddressOwner)
  } catch (error) {
    console.error('[landing-builder] Site address check failed:', error)
    return null
  }
}

export async function signImageUploadAction(input: unknown): Promise<SignUploadResult> {
  const editor = await getEditor()
  if ('error' in editor) return { ok: false, error: editor.error }

  const parsed = imageUploadRequestSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: ERRORS.imageType }

  try {
    return { ok: true, ...(await signImageUpload(editor.user.id, parsed.data.contentType)) }
  } catch (error) {
    console.error('[landing-builder] Signing image upload failed:', error)
    return { ok: false, error: ERRORS.uploadFailed }
  }
}
