/**
 * Utility helpers for formatting and managing cleaning cost and cleaner name
 * tags embedded in booking notes (used by Beds24 integrations & dashboard).
 */

export function formatCleaningNotesTag(cost: number, cleanerName?: string): string {
  const cleanerPart = cleanerName?.trim() ? `, מנקה: ${cleanerName.trim()}` : ''
  return `[עלות ניקיון: ₪${cost}${cleanerPart}]`
}

/**
 * Updates or removes the cleaning tag within a notes string.
 * If hasCleaning is true and cost > 0, removes any prior cleaning tag
 * and appends the new formatted tag.
 * If hasCleaning is false or cost is 0, strips any prior cleaning tag.
 */
export function updateNotesWithCleaning(
  notes: string = '',
  cost: number = 0,
  cleanerName?: string,
  hasCleaning: boolean = cost > 0
): string {
  // Remove any existing cleaning / cleaner tag (e.g. [עלות ניקיון: ₪250, מנקה: מרים])
  const cleanedNotes = notes
    .replace(/(?:\r?\n)?\[?(?:עלות\s*ניקיון|עלות\s*מנקה|ניקיון|cleanerCost|cleaningCost)[:=]?[^\]\r\n]*\]?/gi, '')
    .trim()

  if (hasCleaning && cost > 0) {
    const tag = formatCleaningNotesTag(cost, cleanerName)
    return cleanedNotes ? `${cleanedNotes}\n${tag}` : tag
  }

  return cleanedNotes
}
