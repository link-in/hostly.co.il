'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import TemplateRenderer from '@/components/landing-templates/TemplateRenderer'
import type { PreviewModel } from '@/lib/landingBuilder/selectors'
import { PREVIEW_VIEWPORT_WIDTH } from '@/lib/landingBuilder/previewZoom'
import type { PreviewDevice } from '@/lib/landingBuilder/types'
import { DeviceToggle } from './PreviewToolbar'

interface FullScreenPreviewProps {
  model: PreviewModel
  device: PreviewDevice
  onDeviceChange: (device: PreviewDevice) => void
  onClose: () => void
}

function useCloseOnEscape(onClose: () => void) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])
}

function useLockPageScroll() {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])
}

/** The page at the real browser width — what a guest will see, including unsaved edits. */
export default function FullScreenPreview({ model, device, onDeviceChange, onClose }: FullScreenPreviewProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useCloseOnEscape(onClose)
  useLockPageScroll()
  useEffect(() => closeRef.current?.focus(), [])

  // Portaled to <body>: the sticky preview column is its own stacking context, so the
  // dashboard sidebar would stay on top. `.site-builder` re-applies the CSS reset.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="תצוגה מקדימה" className="site-builder fixed inset-0 z-[1100] flex flex-col bg-slate-100">
      <div className="flex items-center justify-between gap-2 bg-slate-900 px-3 py-2 text-white sm:px-4 sm:py-2.5">
        <span className="truncate text-xs font-semibold sm:text-sm">תצוגה מקדימה · כך האורחים יראו את האתר</span>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <DeviceToggle device={device} onDeviceChange={onDeviceChange} />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium transition hover:bg-white/20 sm:px-3 sm:text-sm"
          >
            <X className="size-4" aria-hidden />
            סגירה
          </button>
        </div>
      </div>
      <div className="min-h-0 grow overflow-y-auto">
        <div
          dir="rtl"
          className="@container mx-auto min-h-full w-full max-w-full overflow-x-hidden bg-white"
          style={{ maxWidth: device === 'mobile' ? `${PREVIEW_VIEWPORT_WIDTH.mobile}px` : undefined }}
        >
          <TemplateRenderer model={model} />
        </div>
      </div>
    </div>,
    document.body,
  )
}
