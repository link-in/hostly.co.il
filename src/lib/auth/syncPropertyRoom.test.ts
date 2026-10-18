import { describe, it, expect } from 'vitest'
import { isPropertyRoomSyncDue } from './syncPropertyRoom'

describe('isPropertyRoomSyncDue', () => {
  it('is due when never synced', () => {
    expect(isPropertyRoomSyncDue(undefined, 1_000)).toBe(true)
  })

  it('is not due within the interval', () => {
    expect(isPropertyRoomSyncDue(1_000, 1_000 + 59_999)).toBe(false)
  })

  it('is due once the interval has elapsed', () => {
    expect(isPropertyRoomSyncDue(1_000, 1_000 + 60_000)).toBe(true)
  })
})
