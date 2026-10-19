import { describe, it, expect } from 'vitest'
import { extractApiErrorMessage } from './apiError'

describe('extractApiErrorMessage', () => {
  it('returns the `error` field from a JSON body', () => {
    expect(extractApiErrorMessage('{"error":"Beds24 דחתה את העדכון: invalid roomId"}', 'fallback')).toBe(
      'Beds24 דחתה את העדכון: invalid roomId',
    )
  })

  it('falls back when JSON has no usable error field', () => {
    expect(extractApiErrorMessage('{"foo":1}', 'fallback')).toBe('fallback')
  })

  it('falls back on an empty body', () => {
    expect(extractApiErrorMessage('  ', 'fallback')).toBe('fallback')
  })

  it('returns plain-text bodies as-is', () => {
    expect(extractApiErrorMessage('Bad gateway', 'fallback')).toBe('Bad gateway')
  })
})
