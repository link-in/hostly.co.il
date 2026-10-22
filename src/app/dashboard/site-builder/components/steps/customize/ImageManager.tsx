'use client'

import type { ChangeEvent } from 'react'
import { ImagePlus, Star, X } from 'lucide-react'
import { getCoverImage } from '@/lib/landingBuilder/selectors'
import type { DraftImage } from '@/lib/landingBuilder/types'
import { useBuilderDispatch, useBuilderState } from '../../../state/BuilderProvider'
import { releaseImage, toUploadedImages } from '../../../state/uploadedImages'

function ImageTile({ image, isCover }: { image: DraftImage; isCover: boolean }) {
  const dispatch = useBuilderDispatch()

  const remove = () => {
    dispatch({ type: 'images/removed', imageId: image.id })
    releaseImage(image)
  }

  return (
    <li className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100">
      <button
        type="button"
        onClick={() => dispatch({ type: 'images/coverSelected', imageId: image.id })}
        aria-label={isCover ? 'תמונת השער הנוכחית' : 'הגדרה כתמונת שער'}
        aria-pressed={isCover}
        className={`block size-full cursor-pointer ${isCover ? 'ring-2 ring-inset ring-(--hb)' : ''}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- blob: URLs from local uploads */}
        <img src={image.url} alt={image.alt} className="size-full object-cover" />
      </button>
      {isCover && (
        <span className="pointer-events-none absolute bottom-1 right-1 flex items-center gap-0.5 rounded-full bg-(--hb) px-1.5 py-0.5 text-[10px] font-semibold text-white">
          <Star className="size-2.5 fill-current" aria-hidden />
          שער
        </span>
      )}
      <button
        type="button"
        onClick={remove}
        aria-label="הסרת תמונה"
        className="absolute left-1 top-1 grid size-6 cursor-pointer place-items-center rounded-full bg-slate-900/60 text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </li>
  )
}

function UploadTile() {
  const dispatch = useBuilderDispatch()

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const images = toUploadedImages(event.target.files)
    if (images.length > 0) dispatch({ type: 'images/added', images })
    event.target.value = ''
  }

  return (
    <li className="aspect-square">
      <label className="flex size-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-[1px] border-dashed border-slate-300 text-xs text-slate-500 transition hover:border-(--hb) hover:text-(--hb)">
        <ImagePlus className="size-5" aria-hidden />
        העלאה
        <input type="file" accept="image/*" multiple onChange={handleChange} className="sr-only" />
      </label>
    </li>
  )
}

export default function ImageManager() {
  const { draft } = useBuilderState()
  const coverId = getCoverImage(draft)?.id

  return (
    <div>
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium text-slate-700">תמונות</span>
        <span className="text-xs text-slate-400">לחיצה על תמונה = תמונת שער</span>
      </span>
      <ul className="grid grid-cols-3 gap-2">
        {draft.images.map((image) => (
          <ImageTile key={image.id} image={image} isCover={image.id === coverId} />
        ))}
        <UploadTile />
      </ul>
    </div>
  )
}
