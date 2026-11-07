import { ImageIcon } from 'lucide-react'
import type { DraftImage } from '@/lib/landingBuilder/types'

/** Plain <img>: sources include local blob: uploads and arbitrary channel CDNs. */
interface TemplateImageProps {
  image: DraftImage | null
  className?: string
  imageClassName?: string
}

export function TemplateImage({ image, className = '', imageClassName = '' }: TemplateImageProps) {
  return (
    <div className={`overflow-hidden bg-slate-100 ${className}`}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.url} alt={image.alt} className={`size-full object-cover ${imageClassName}`} />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 bg-linear-to-br from-slate-200 to-slate-100 text-slate-400">
          <ImageIcon className="size-10" strokeWidth={1.5} aria-hidden />
          <span className="text-sm">תמונת שער</span>
        </div>
      )}
    </div>
  )
}
