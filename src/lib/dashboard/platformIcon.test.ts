import { describe, it, expect } from 'vitest'
import { RESERVATION_CALL_ICON_COLOR } from './platformIcon'

describe('reservation call icon color', () => {
  it('uses brand purple, not the leftover pink accent', () => {
    expect(RESERVATION_CALL_ICON_COLOR).toBe('#7133D9')
    expect(RESERVATION_CALL_ICON_COLOR).not.toBe('#f093fb')
  })
})
