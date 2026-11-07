import { describe, expect, it } from 'vitest'
import { actionForKey, actionForSwipe, formatPosition, stepIndex, SWIPE_THRESHOLD_PX, wrapIndex } from './lightboxNavigation'

describe('wrapIndex', () => {
  it('wraps past both ends', () => {
    expect(wrapIndex(5, 5)).toBe(0)
    expect(wrapIndex(-1, 5)).toBe(4)
    expect(wrapIndex(2, 5)).toBe(2)
  })

  it('returns 0 for an empty gallery', () => {
    expect(wrapIndex(3, 0)).toBe(0)
  })
})

describe('stepIndex', () => {
  it('moves forward and back with wrap-around', () => {
    expect(stepIndex(0, 'next', 3)).toBe(1)
    expect(stepIndex(2, 'next', 3)).toBe(0)
    expect(stepIndex(0, 'previous', 3)).toBe(2)
  })
})

describe('actionForKey', () => {
  it('maps keys for an RTL gallery', () => {
    expect(actionForKey('Escape')).toBe('close')
    expect(actionForKey('ArrowLeft')).toBe('next')
    expect(actionForKey('ArrowRight')).toBe('previous')
    expect(actionForKey('Enter')).toBeNull()
  })
})

describe('actionForSwipe', () => {
  it('ignores short drags', () => {
    expect(actionForSwipe(SWIPE_THRESHOLD_PX - 1)).toBeNull()
    expect(actionForSwipe(-(SWIPE_THRESHOLD_PX - 1))).toBeNull()
  })

  it('swipes right to go forward and left to go back', () => {
    expect(actionForSwipe(80)).toBe('next')
    expect(actionForSwipe(-80)).toBe('previous')
  })
})

describe('formatPosition', () => {
  it('is 1-based', () => {
    expect(formatPosition(0, 12)).toBe('1 / 12')
  })
})
