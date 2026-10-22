import { createServiceRoleClient } from '@/lib/supabase/server'
import { LANDING_IMAGES_BUCKET, buildUploadPath, type UploadContentType } from './imageUpload'

export interface SignedImageUpload {
  uploadUrl: string
  publicUrl: string
}

/** Signed one-time upload URL, so large images go straight to Storage instead of through a function. */
export async function signImageUpload(userId: string, contentType: UploadContentType): Promise<SignedImageUpload> {
  const storage = createServiceRoleClient().storage.from(LANDING_IMAGES_BUCKET)
  const path = buildUploadPath(userId, contentType, crypto.randomUUID())

  const { data, error } = await storage.createSignedUploadUrl(path)
  if (error || !data) throw new Error(`Signing upload failed: ${error?.message ?? 'no data'}`)

  return { uploadUrl: data.signedUrl, publicUrl: storage.getPublicUrl(path).data.publicUrl }
}
