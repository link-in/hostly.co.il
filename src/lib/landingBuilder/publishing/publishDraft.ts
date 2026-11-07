import { belongsToProperty, storedDraftSchema } from '../persistence/storedDraft'
import type { SiteAddressCheck } from '../siteAddressAvailability'
import type { LandingDraft } from '../types'
import { getPublishBlockers, PUBLISH_BLOCKER_MESSAGES } from './publishBlockers'

export type PublishResult = { ok: true; address: string; publishedAt: string } | { ok: false; error: string }

export interface PublishDeps {
  checkAddress: (address: string) => Promise<SiteAddressCheck>
  saveDraft: (draft: LandingDraft) => Promise<string>
  publishSite: (draft: LandingDraft) => Promise<string>
  isAddressTakenError: (error: unknown) => boolean
}

export const PUBLISH_ERRORS = {
  invalid: 'לא ניתן לפרסם: חלק מהנתונים אינם תקינים.',
  foreignProperty: 'הטיוטה שייכת לנכס אחר.',
  taken: 'הכתובת כבר תפוסה. בחרו כתובת אחרת.',
  failed: 'הפרסום נכשל. נסו שוב בעוד רגע.',
} as const

const fail = (error: string): PublishResult => ({ ok: false, error })

/** Validates the draft, then saves it and copies it to the public snapshot. */
export async function publishDraft(input: unknown, sessionPropertyId: string | null | undefined, deps: PublishDeps): Promise<PublishResult> {
  const parsed = storedDraftSchema.safeParse(input)
  if (!parsed.success) return fail(PUBLISH_ERRORS.invalid)
  const draft = parsed.data
  if (!belongsToProperty(draft, sessionPropertyId)) return fail(PUBLISH_ERRORS.foreignProperty)

  const [blocker] = getPublishBlockers(draft)
  if (blocker) return fail(PUBLISH_BLOCKER_MESSAGES[blocker])

  try {
    const check = await deps.checkAddress(draft.siteAddress)
    if (check.status === 'taken' || check.status === 'invalid') return fail(check.message)
    await deps.saveDraft(draft)
    return { ok: true, address: draft.siteAddress, publishedAt: await deps.publishSite(draft) }
  } catch (error) {
    if (deps.isAddressTakenError(error)) return fail(PUBLISH_ERRORS.taken)
    console.error('[landing-builder] Publishing failed:', error)
    return fail(PUBLISH_ERRORS.failed)
  }
}
