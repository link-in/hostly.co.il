'use client'

import { useCallback, useEffect, useMemo, useRef, type MouseEvent, type ReactNode, type TouchEvent } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { DraftImage } from '@/lib/landingBuilder/types'
import { formatPosition, stepIndex, wrapIndex, type LightboxAction } from '@/lib/landingBuilder/gallery/lightboxNavigation'
import { SITE_FONT_CLASSES } from '../../siteFonts'
import { useBodyScrollLock, useLightboxKeyboard, usePreloadImages, useSwipe } from './useLightboxControls'

interface LightboxProps {
  images: DraftImage[]
  index: number
  onNavigate: (index: number) => void
  onClose: () => void
}

const ROUND_BUTTON =
  'flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white'

export function Lightbox({ images, index, onNavigate, onClose }: LightboxProps) {
  const handleAction = useCallback(
    (action: LightboxAction) => (action === 'close' ? onClose() : onNavigate(stepIndex(index, action, images.length))),
    [images.length, index, onClose, onNavigate],
  )
  useLightboxKeyboard(handleAction)
  useBodyScrollLock()
  usePreloadImages(useNeighbourUrls(images, index))
  const swipe = useSwipe(handleAction)
  const image = images[index]
  if (!image) return null
  const hasMany = images.length > 1

  return (
    <LightboxPortal>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="גלריית תמונות"
        className="fixed inset-0 z-[1200] flex flex-col bg-neutral-950/95 text-white backdrop-blur-sm transition-opacity duration-300 starting:opacity-0"
      >
        <TopBar position={formatPosition(index, images.length)} onClose={onClose} />
        <Stage image={image} onBackdropClick={onClose} {...swipe}>
          {hasMany && <StepButton action="previous" onAction={handleAction} />}
          {hasMany && <StepButton action="next" onAction={handleAction} />}
        </Stage>
        {hasMany && <Thumbnails images={images} activeIndex={index} onSelect={onNavigate} />}
      </div>
    </LightboxPortal>
  )
}

/** Rendered on <body> so the builder preview's zoom/overflow can't clip it; re-applies the site reset and font. */
function LightboxPortal({ children }: { children: ReactNode }) {
  return createPortal(
    <div className={`site-builder ${SITE_FONT_CLASSES} font-sans`} dir="rtl">
      {children}
    </div>,
    document.body,
  )
}

function useNeighbourUrls(images: DraftImage[], index: number): string[] {
  return useMemo(() => {
    if (images.length < 2) return []
    return [images[wrapIndex(index + 1, images.length)].url, images[wrapIndex(index - 1, images.length)].url]
  }, [images, index])
}

function TopBar({ position, onClose }: { position: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => closeRef.current?.focus(), [])
  return (
    <div className="flex items-center justify-between px-[1rem] py-[0.75rem] @3xl:px-6">
      <span className="text-sm tabular-nums text-white/70" dir="ltr">
        {position}
      </span>
      <button ref={closeRef} type="button" onClick={onClose} aria-label="סגירה" className={ROUND_BUTTON}>
        <X className="size-5" aria-hidden />
      </button>
    </div>
  )
}

interface StageProps {
  image: DraftImage
  onBackdropClick: () => void
  onTouchStart: (event: TouchEvent) => void
  onTouchEnd: (event: TouchEvent) => void
  children: ReactNode
}

function Stage({ image, onBackdropClick, onTouchStart, onTouchEnd, children }: StageProps) {
  const closeOnBackdrop = (event: MouseEvent) => {
    if (event.target === event.currentTarget) onBackdropClick()
  }
  return (
    <div
      className="relative flex min-h-0 flex-1 items-center justify-center px-[1rem] pb-[1rem] sm:px-20"
      onClick={closeOnBackdrop}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* No caption: imported alts are usually just the property name. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={image.id}
        src={image.url}
        alt={image.alt}
        className="max-h-[calc(100dvh-9rem)] max-w-full select-none rounded-lg object-contain shadow-2xl shadow-black/50 transition duration-300 ease-out starting:scale-[0.97] starting:opacity-0"
        draggable={false}
      />
      {children}
    </div>
  )
}

function StepButton({ action, onAction }: { action: 'next' | 'previous'; onAction: (action: LightboxAction) => void }) {
  const isNext = action === 'next'
  const Icon = isNext ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={() => onAction(action)}
      aria-label={isNext ? 'התמונה הבאה' : 'התמונה הקודמת'}
      className={`${ROUND_BUTTON} absolute top-1/2 hidden -translate-y-1/2 sm:flex ${isNext ? 'left-5' : 'right-5'}`}
    >
      <Icon className="size-6" aria-hidden />
    </button>
  )
}

interface ThumbnailsProps {
  images: DraftImage[]
  activeIndex: number
  onSelect: (index: number) => void
}

function Thumbnails({ images, activeIndex, onSelect }: ThumbnailsProps) {
  const activeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeIndex])
  return (
    <div className="flex justify-center-safe gap-2 overflow-x-auto px-[1rem] pb-[1rem] [scrollbar-width:none]">
      {images.map((image, index) => {
        const isActive = index === activeIndex
        return (
          <button
            key={image.id}
            ref={isActive ? activeRef : undefined}
            type="button"
            onClick={() => onSelect(index)}
            aria-label={`תמונה ${index + 1}`}
            aria-current={isActive ? 'true' : undefined}
            className={`h-14 w-20 shrink-0 cursor-pointer overflow-hidden rounded-md transition duration-200 ${
              isActive ? 'opacity-100 ring-2 ring-white' : 'opacity-40 hover:opacity-80'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt="" className="size-full object-cover" draggable={false} />
          </button>
        )
      })}
    </div>
  )
}
