import type { PreviewDevice } from './types'

export const PREVIEW_VIEWPORT_WIDTH: Record<PreviewDevice, number> = {
  desktop: 1280,
  mobile: 390,
}

/** CSS `zoom` that fits a `virtualWidth`-wide page into `availableWidth`; never enlarges. */
export function computePreviewZoom(availableWidth: number, virtualWidth: number): number {
  if (availableWidth <= 0 || virtualWidth <= 0) return 1
  return Math.min(1, Math.round((availableWidth / virtualWidth) * 10_000) / 10_000)
}
