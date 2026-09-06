/**
 * Beds24 Credit Guard
 *
 * Detects when the Beds24 API credit/quota is exhausted and stores
 * the suspension state in the `users` table so the dashboard can
 * warn the user and block further mutations until credits are recharged.
 *
 * Beds24 V2 returns HTTP 402 when credits run out, or HTTP 200 with a
 * body containing `{ success: false, errors: [{ message: "..." }] }`
 * where the message mentions "credit" / "quota" / "no api credits".
 */

import { createServiceRoleClient } from '@/lib/supabase/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Beds24SuspensionStatus {
  suspended: boolean
  errorMsg?: string
  suspendedAt?: string // ISO timestamp
}

// ─── Detection ────────────────────────────────────────────────────────────────

/**
 * Credit-related keywords in Beds24 error messages.
 * Matches: "no api credits", "api credits", "credit", "quota", "payment required"
 */
const CREDIT_KEYWORDS = ['credit', 'quota', 'no api', 'payment required', 'insufficient']

/**
 * Returns true if the HTTP status or parsed body indicates a Beds24
 * credit / subscription exhaustion error.
 */
export function isBeds24CreditError(status: number, body?: unknown): boolean {
  // HTTP 402 Payment Required — clearest signal
  if (status === 402) return true

  // Parse body for credit-related error messages
  if (body && typeof body === 'object') {
    const errorMessages = extractErrorMessages(body)
    return errorMessages.some((msg) =>
      CREDIT_KEYWORDS.some((kw) => msg.toLowerCase().includes(kw))
    )
  }

  return false
}

/**
 * Recursively pulls all error/message strings from a Beds24 response body.
 */
export function extractErrorMessages(body: unknown): string[] {
  const messages: string[] = []

  if (typeof body === 'string') {
    messages.push(body)
    return messages
  }

  if (Array.isArray(body)) {
    for (const item of body) {
      messages.push(...extractErrorMessages(item))
    }
    return messages
  }

  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>

    // Common Beds24 error shapes
    if (typeof obj.message === 'string')  messages.push(obj.message)
    if (typeof obj.error === 'string')    messages.push(obj.error)
    if (typeof obj.details === 'string')  messages.push(obj.details)

    if (Array.isArray(obj.errors)) {
      for (const e of obj.errors) {
        messages.push(...extractErrorMessages(e))
      }
    }
    if (Array.isArray(obj.bookings)) {
      for (const b of obj.bookings) {
        messages.push(...extractErrorMessages(b))
      }
    }
  }

  return messages
}

// ─── API Route Helper ────────────────────────────────────────────────────────

/**
 * Convenience helper for use inside Next.js API routes.
 * Clones the response body, checks for credit errors, and marks the user
 * as suspended in the DB if detected. Does NOT consume the original response.
 *
 * Usage inside a route:
 *   const response = await fetchWithTokenRefresh(...)
 *   if (!response.ok) {
 *     await detectAndMarkCreditError(response, session.user.id)
 *     return NextResponse.json({ error: '...' }, { status: 502 })
 *   }
 */
export async function detectAndMarkCreditError(
  response: Response,
  userId: string | undefined
): Promise<boolean> {
  if (!userId) return false

  let body: unknown
  try {
    const text = await response.clone().text()
    body = JSON.parse(text)
  } catch {
    body = undefined
  }

  if (!isBeds24CreditError(response.status, body)) return false

  const errorMsg =
    extractErrorMessages(body ?? {}).filter(Boolean).join('; ') ||
    `HTTP ${response.status}`

  await markBeds24Suspended(userId, errorMsg)
  return true
}

// ─── Database helpers ─────────────────────────────────────────────────────────

/**
 * Marks a user's Beds24 integration as suspended in the database.
 * Call this whenever a credit-exhaustion error is detected.
 */
export async function markBeds24Suspended(
  userId: string,
  errorMsg: string
): Promise<void> {
  try {
    const supabase = createServiceRoleClient()
    const { error } = await supabase
      .from('users')
      .update({
        beds24_api_suspended_at: new Date().toISOString(),
        beds24_api_error_msg: errorMsg,
      })
      .eq('id', userId)

    if (error) {
      console.error('[Beds24CreditGuard] Failed to write suspension to DB:', error)
    } else {
      console.warn('[Beds24CreditGuard] User', userId, 'marked as suspended. Error:', errorMsg)
    }
  } catch (err) {
    console.error('[Beds24CreditGuard] markBeds24Suspended threw:', err)
  }
}

/**
 * Clears the suspension flag — call when the user confirms they've
 * recharged their Beds24 credits and wants to resume operations.
 */
export async function clearBeds24Suspension(userId: string): Promise<void> {
  try {
    const supabase = createServiceRoleClient()
    const { error } = await supabase
      .from('users')
      .update({
        beds24_api_suspended_at: null,
        beds24_api_error_msg: null,
      })
      .eq('id', userId)

    if (error) {
      console.error('[Beds24CreditGuard] Failed to clear suspension:', error)
    } else {
      console.log('[Beds24CreditGuard] Suspension cleared for user', userId)
    }
  } catch (err) {
    console.error('[Beds24CreditGuard] clearBeds24Suspension threw:', err)
  }
}

/**
 * Reads the current Beds24 suspension status for a user from the database.
 */
export async function getBeds24SuspensionStatus(
  userId: string
): Promise<Beds24SuspensionStatus> {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('users')
      .select('beds24_api_suspended_at, beds24_api_error_msg')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return { suspended: false }
    }

    const row = data as {
      beds24_api_suspended_at: string | null
      beds24_api_error_msg: string | null
    }

    if (!row.beds24_api_suspended_at) {
      return { suspended: false }
    }

    return {
      suspended: true,
      errorMsg: row.beds24_api_error_msg ?? undefined,
      suspendedAt: row.beds24_api_suspended_at,
    }
  } catch (err) {
    console.error('[Beds24CreditGuard] getBeds24SuspensionStatus threw:', err)
    return { suspended: false }
  }
}
