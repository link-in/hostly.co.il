/**
 * Pure message builders for the morning-of-arrival WhatsApp automation.
 * No I/O — fully unit-testable.
 *
 * Sends a single message: photo + caption (greeting + body text + Waze link).
 */

// Whapi caption hard limit (leave margin for emojis/newlines)
const CAPTION_MAX_CHARS = 900

export interface ArrivalMessageInput {
  guestName: string
  propertyName: string
  introText: string | null
  wazeLink: string | null
  houseRules?: string | null // kept for backward compat, not used
}

/**
 * Builds the caption to be sent alongside the house photo.
 * Truncates gracefully if combined text exceeds the Whapi limit.
 */
export function buildArrivalCaption(input: ArrivalMessageInput): string {
  const { guestName, propertyName, introText, wazeLink } = input

  const greeting = `שלום ${guestName}! 🏡\n\nברוכים הבאים ל${propertyName}!`

  const parts: string[] = [greeting]

  if (introText?.trim()) {
    parts.push(introText.trim())
  }

  if (wazeLink?.trim()) {
    parts.push(`📍 *ניווט לנכס (Waze):*\n${wazeLink.trim()}`)
  }

  const joined = parts.join('\n\n')
  if (joined.length <= CAPTION_MAX_CHARS) return joined

  // Trim intro to fit
  const wazeSection = wazeLink?.trim() ? `\n\n📍 *ניווט לנכס (Waze):*\n${wazeLink.trim()}` : ''
  const fixedParts = greeting + wazeSection
  if (fixedParts.length >= CAPTION_MAX_CHARS) return fixedParts.slice(0, CAPTION_MAX_CHARS)

  const introMaxLen = CAPTION_MAX_CHARS - greeting.length - wazeSection.length - 2
  const trimmedIntro = (introText?.trim() ?? '').slice(0, introMaxLen)
  return [greeting, trimmedIntro, wazeLink?.trim() ? `📍 *ניווט לנכס (Waze):*\n${wazeLink.trim()}` : '']
    .filter(Boolean)
    .join('\n\n')
}

/**
 * @deprecated No longer sent as a separate message — content is merged into the caption.
 * Kept for backward compatibility with existing tests/callers.
 */
export function buildHouseRulesMessage(_input: ArrivalMessageInput): string | null {
  return null
}
