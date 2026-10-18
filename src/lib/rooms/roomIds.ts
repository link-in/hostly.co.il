/**
 * שדה `users.room_id` יכול להכיל:
 *   - מזהה בודד:            "638851"
 *   - רשימה מופרדת בפסיקים:  "638851,672381"
 *   - זוגות id:name:         "744952:Bay leaves,744953:חדר שני"
 * (האשף כותב תמיד id:name כדי שהטאבים בדשבורד יציגו שם.)
 */
export function parseRoomIds(roomField: string | null | undefined): string[] {
  return (roomField ?? '')
    .split(',')
    .map((part) => part.split(':')[0].trim())
    .filter(Boolean)
}

/** האם החדר שייך לשדה room_id של המשתמש, בכל אחד מהפורמטים. */
export function roomFieldIncludes(roomField: string | null | undefined, roomId: number | string): boolean {
  return parseRoomIds(roomField).includes(String(roomId).trim())
}
