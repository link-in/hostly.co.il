import { describe, expect, it } from 'vitest'
import { computePreviewZoom } from './previewZoom'

describe('computePreviewZoom', () => {
  it('shrinks a desktop page to the available width', () => {
    expect(computePreviewZoom(640, 1280)).toBe(0.5)
  })

  it('never enlarges past 100%', () => {
    expect(computePreviewZoom(1600, 1280)).toBe(1)
  })

  it('falls back to 1 before the container has been measured', () => {
    expect(computePreviewZoom(0, 1280)).toBe(1)
  })

  it('rounds to 4 decimals to avoid sub-pixel jitter', () => {
    expect(computePreviewZoom(700, 1280)).toBe(0.5469)
  })
})
