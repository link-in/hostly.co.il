import { getInvalidContactFields, hasContact } from '../contact'
import { getLocalImages } from '../persistence/storedDraft'
import { getCoverImage } from '../selectors'
import { validateSiteAddress } from '../siteAddress'
import type { LandingDraft } from '../types'

export type PublishBlocker =
  | 'template'
  | 'title'
  | 'coverImage'
  | 'siteAddress'
  | 'contact'
  | 'contactInvalid'
  | 'unsavedImages'

export const PUBLISH_BLOCKER_MESSAGES: Record<PublishBlocker, string> = {
  template: 'בחרו תבנית עיצוב.',
  title: 'הוסיפו כותרת ראשית לאתר.',
  coverImage: 'הוסיפו לפחות תמונה אחת.',
  siteAddress: 'בחרו כתובת תקינה לאתר.',
  contact: 'הוסיפו וואטסאפ, טלפון או מייל, כדי שאורחים יוכלו לפנות אליכם.',
  contactInvalid: 'אחד מפרטי הקשר אינו תקין.',
  unsavedImages: 'יש תמונות שעדיין לא הועלו. שמרו את הטיוטה ונסו שוב.',
}

const BLOCKER_CHECKS: ReadonlyArray<[PublishBlocker, (draft: LandingDraft) => boolean]> = [
  ['template', (draft) => draft.templateId !== null],
  ['title', (draft) => draft.content.heroTitle.trim().length > 0],
  ['coverImage', (draft) => getCoverImage(draft) !== null],
  ['siteAddress', (draft) => validateSiteAddress(draft.siteAddress) === null],
  ['contact', (draft) => hasContact(draft.contact)],
  ['contactInvalid', (draft) => getInvalidContactFields(draft.contact).length === 0],
]

/** What still prevents publishing, in wizard order. `blob:` images are allowed while the client can still upload them. */
export function getPublishBlockers(draft: LandingDraft, { allowLocalImages = false } = {}): PublishBlocker[] {
  const blockers = BLOCKER_CHECKS.filter(([, isReady]) => !isReady(draft)).map(([blocker]) => blocker)
  if (!allowLocalImages && getLocalImages(draft).length > 0) blockers.push('unsavedImages')
  return blockers
}
