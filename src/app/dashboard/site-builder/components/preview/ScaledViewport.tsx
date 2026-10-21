'use client'

import { useRef, type ReactNode } from 'react'
import { computePreviewZoom } from '@/lib/landingBuilder/previewZoom'
import { useElementWidth } from './useElementWidth'

/**
 * Lays the page out at a real viewport width and zooms it down to fit, so the
 * templates' container queries (@3xl:…) see 1280px on desktop and 390px on mobile.
 */
export function ScaledViewport({ virtualWidth, children }: { virtualWidth: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const availableWidth = useElementWidth(ref)
  const zoom = computePreviewZoom(availableWidth, virtualWidth)

  return (
    <div ref={ref} className="min-h-0 grow overflow-y-auto overflow-x-hidden [scrollbar-width:thin]">
      <div
        dir="rtl"
        className="@container"
        style={{ width: virtualWidth, zoom, visibility: availableWidth > 0 ? 'visible' : 'hidden' }}
      >
        {children}
      </div>
    </div>
  )
}
