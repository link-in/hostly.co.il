export const GENERIC_CHAT_ERROR = 'אירעה שגיאה. נסה שוב.'

/** The chat transport puts a failed response body in `error.message`; the route sends `{ error }` in Hebrew. */
export function readChatErrorMessage(error: Error): string {
  try {
    const parsed = JSON.parse(error.message) as { error?: unknown }
    if (typeof parsed.error === 'string' && parsed.error) return parsed.error
  } catch {
    // Not a JSON body (network failure, stream error) — fall through to the generic message.
  }
  return GENERIC_CHAT_ERROR
}
