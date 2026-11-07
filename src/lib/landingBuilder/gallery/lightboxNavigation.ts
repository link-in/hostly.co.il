export type LightboxAction = 'next' | 'previous' | 'close'

/** Minimum horizontal travel (px) before a touch drag counts as a swipe. */
export const SWIPE_THRESHOLD_PX = 50

export function wrapIndex(index: number, count: number): number {
  if (count <= 0) return 0
  return ((index % count) + count) % count
}

export function stepIndex(current: number, action: Exclude<LightboxAction, 'close'>, count: number): number {
  return wrapIndex(current + (action === 'next' ? 1 : -1), count)
}

/** Sites are RTL: the next image sits to the left, so ArrowLeft moves forward. */
export function actionForKey(key: string): LightboxAction | null {
  if (key === 'Escape') return 'close'
  if (key === 'ArrowLeft') return 'next'
  if (key === 'ArrowRight') return 'previous'
  return null
}

/** RTL as well: dragging the image to the right reveals the next one. */
export function actionForSwipe(deltaX: number): LightboxAction | null {
  if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return null
  return deltaX > 0 ? 'next' : 'previous'
}

export function formatPosition(index: number, count: number): string {
  return `${index + 1} / ${count}`
}
