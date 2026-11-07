import { getLocalImages, replaceImageUrls } from '@/lib/landingBuilder/persistence/storedDraft'
import type { DraftImage, LandingDraft } from '@/lib/landingBuilder/types'
import { saveDraftAction, signImageUploadAction } from '../draftActions'

export interface PersistDeps {
  readFile: (url: string) => Promise<Blob>
  signUpload: typeof signImageUploadAction
  putFile: (uploadUrl: string, file: Blob) => Promise<boolean>
  save: typeof saveDraftAction
}

export interface PersistResult {
  urls: Record<string, string>
  savedAt: string
}

const UPLOAD_FAILED = 'העלאת התמונה נכשלה. נסו שוב בעוד רגע.'

const defaultDeps: PersistDeps = {
  readFile: async (url) => (await fetch(url)).blob(),
  signUpload: signImageUploadAction,
  putFile: async (uploadUrl, file) =>
    (await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })).ok,
  save: saveDraftAction,
}

async function uploadImage(image: DraftImage, deps: PersistDeps): Promise<string> {
  const file = await deps.readFile(image.url)
  const signed = await deps.signUpload({ contentType: file.type, size: file.size })
  if (!signed.ok) throw new Error(signed.error)
  if (!(await deps.putFile(signed.uploadUrl, file))) throw new Error(UPLOAD_FAILED)
  return signed.publicUrl
}

/** Uploads local images to Storage, then saves the draft with their hosted URLs. Throws Hebrew messages. */
export async function persistDraft(draft: LandingDraft, deps: PersistDeps = defaultDeps): Promise<PersistResult> {
  const localImages = getLocalImages(draft)
  const hostedUrls = await Promise.all(localImages.map((image) => uploadImage(image, deps)))
  const urls = Object.fromEntries(localImages.map((image, index) => [image.id, hostedUrls[index]]))

  const result = await deps.save(replaceImageUrls(draft, urls))
  if (!result.ok) throw new Error(result.error)
  return { urls, savedAt: result.savedAt }
}
