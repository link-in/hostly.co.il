import type { DraftImage } from '@/lib/landingBuilder/types'

/** Local, preview-only images. Persisting them to Supabase Storage is phase 6. */
export function toUploadedImages(files: FileList | null): DraftImage[] {
  return Array.from(files ?? [])
    .filter((file) => file.type.startsWith('image/'))
    .map((file) => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(file),
      alt: file.name,
      source: 'upload',
    }))
}

export function releaseImage(image: DraftImage): void {
  if (image.source === 'upload') URL.revokeObjectURL(image.url)
}
