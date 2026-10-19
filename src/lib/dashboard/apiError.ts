/**
 * מחלץ הודעת שגיאה קריאה מתגובת API כושלת.
 * הנתיבים מחזירים `{ error: string }`; אם אין — נופלים לטקסט הגולמי או להודעת ברירת מחדל.
 */
export function extractApiErrorMessage(rawBody: string, fallback: string): string {
  const text = rawBody.trim()
  if (!text) return fallback
  try {
    const parsed: unknown = JSON.parse(text)
    const error = parsed && typeof parsed === 'object' ? (parsed as { error?: unknown }).error : undefined
    if (typeof error === 'string' && error.trim()) return error
    return fallback
  } catch {
    return text
  }
}

export async function readApiError(response: Response, fallback: string): Promise<string> {
  return extractApiErrorMessage(await response.text(), fallback)
}
