'use server'

import { getServerSession, type Session } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { isSiteBuilderEnabled } from '@/lib/landingBuilder/featureFlag'
import { saveDraft } from '@/lib/landingBuilder/persistence/draftRepository'
import { imageUploadRequestSchema, MAX_UPLOAD_BYTES } from '@/lib/landingBuilder/persistence/imageUpload'
import { signImageUpload, type SignedImageUpload } from '@/lib/landingBuilder/persistence/signImageUpload'
import { belongsToProperty, storedDraftSchema } from '@/lib/landingBuilder/persistence/storedDraft'

export type SaveDraftResult = { ok: true; savedAt: string } | { ok: false; error: string }
export type SignUploadResult = ({ ok: true } & SignedImageUpload) | { ok: false; error: string }

const ERRORS = {
  session: 'יש להתחבר מחדש למערכת.',
  demo: 'שמירה אינה זמינה במשתמש דמו.',
  invalid: 'לא ניתן לשמור: חלק מהנתונים אינם תקינים.',
  foreignProperty: 'הטיוטה שייכת לנכס אחר.',
  saveFailed: 'השמירה נכשלה. נסו שוב בעוד רגע.',
  imageType: `אפשר להעלות רק תמונות JPG, PNG, WebP, GIF או AVIF עד ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.`,
  uploadFailed: 'העלאת התמונה נכשלה. נסו שוב בעוד רגע.',
} as const

type EditorUser = Session['user']

async function getEditor(): Promise<{ user: EditorUser } | { error: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !isSiteBuilderEnabled()) return { error: ERRORS.session }
  if (session.user.isDemo) return { error: ERRORS.demo }
  return { user: session.user }
}

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
