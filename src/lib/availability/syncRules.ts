/**
 * כללי סנכרון זמינות בין Beds24 ל-`availability_cache`.
 * פונקציה טהורה (ללא I/O) כדי שאפשר לבדוק אותה בקלות.
 */

export interface NumAvailInputs {
  /** הלילה תפוס בהזמנה פעילה (לא מבוטלת). */
  bookedNight: boolean
  /** הערך שהוחזר מ-Beds24 (`includeNumAvail=true`), או null אם השדה לא הוחזר. */
  beds24NumAvail: number | null
  /** החסימה הידנית שנשמרה ב-cache (משמשת רק כשאין ערך מ-Beds24). */
  manuallyBlockedInCache: boolean
}

/**
 * מחליט מה ייכתב ל-`num_avail` ב-cache ללילה אחד.
 *
 * סדר העדיפויות:
 * 1. לילה תפוס בהזמנה תמיד חסום. Beds24 לא תמיד מוריד זמינות לבד.
 * 2. אם Beds24 החזירה ערך, הוא מקור האמת (כולל חסימה או שחרור שנעשו ישירות ב-Beds24).
 * 3. אחרת (תאימות לאחור) שומרים חסימה ידנית שקיימת ב-cache.
 */
export function resolveNumAvail({ bookedNight, beds24NumAvail, manuallyBlockedInCache }: NumAvailInputs): number {
  if (bookedNight) return 0
  if (beds24NumAvail !== null) return beds24NumAvail
  return manuallyBlockedInCache ? 0 : 1
}
