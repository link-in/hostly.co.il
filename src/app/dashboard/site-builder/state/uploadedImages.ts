import type { DraftImage } from '@/lib/landingBuilder/types'

/** Local previews; `persistDraft` uploads them to Storage when the draft is saved. */
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
