'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { DraftImage } from '@/lib/landingBuilder/types'
import { TemplateImage } from '../TemplateImage'
import { Lightbox } from './Lightbox'

const OpenLightboxContext = createContext<(index: number) => void>(() => {})

/** Owns which gallery image is enlarged; templates keep their own grid layout and render `GalleryThumb`s inside. */
export function GalleryLightbox({ images, children }: { images: DraftImage[]; children: ReactNode }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const close = useCallback(() => setOpenIndex(null), [])
  return (
    <OpenLightboxContext.Provider value={setOpenIndex}>
      {children}
      {openIndex !== null && <Lightbox images={images} index={openIndex} onNavigate={setOpenIndex} onClose={close} />}
    </OpenLightboxContext.Provider>
  )
}

export function GalleryThumb({ image, index, className = '' }: { image: DraftImage; index: number; className?: string }) {
  const open = useContext(OpenLightboxContext)
  return (
    <button
      type="button"
      onClick={() => open(index)}
      aria-label={`הגדלת תמונה ${index + 1}`}
      className={`group relative block cursor-zoom-in overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${className}`}
    >
      <TemplateImage image={image} className="size-full" imageClassName="transition duration-500 ease-out group-hover:scale-105" />
      <span className="absolute inset-0 bg-black/0 transition duration-300 group-hover:bg-black/10" aria-hidden />
    </button>
  )
}
