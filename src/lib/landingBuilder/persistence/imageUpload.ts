import { z } from 'zod'

export const LANDING_IMAGES_BUCKET = 'landing-images'
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
} as const

export type UploadContentType = keyof typeof EXTENSIONS

export const imageUploadRequestSchema = z.object({
  contentType: z.enum(Object.keys(EXTENSIONS) as [UploadContentType, ...UploadContentType[]]),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
})
export type ImageUploadRequest = z.infer<typeof imageUploadRequestSchema>

/** Server-chosen path: the client never controls folders or file names. */
export function buildUploadPath(userId: string, contentType: UploadContentType, fileId: string): string {
  return `${userId}/site-builder/${fileId}.${EXTENSIONS[contentType]}`
}
