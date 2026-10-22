import { describe, it, expect } from 'vitest'
import { GENERIC_CHAT_ERROR, readChatErrorMessage } from './chatErrors'

describe('readChatErrorMessage', () => {
  it('shows the Hebrew error sent by the route', () => {
    expect(readChatErrorMessage(new Error('{"error":"הגעת למגבלת השימוש לשעה."}'))).toBe('הגעת למגבלת השימוש לשעה.')
  })

  it.each(['Failed to fetch', '{"error":""}', '{"error":42}', '{}'])('falls back to a generic message for %s', (message) => {
    expect(readChatErrorMessage(new Error(message))).toBe(GENERIC_CHAT_ERROR)
  })
})
