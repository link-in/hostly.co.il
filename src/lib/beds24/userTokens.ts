/**
 * מקור האמת לטוקני Beds24 של משתמש הוא טבלת `users` ב-DB — לא ה-JWT של הסשן.
 *
 * ה-JWT נוצר בהתחברות ונשאר בתוקף 30 יום. אם בינתיים הוחלפו הטוקנים של המשתמש
 * (למשל בזמן onboarding/חיבור חשבון Beds24 חדש), הסשן ממשיך להחזיק טוקנים של חשבון ישן:
 * הקריאות מחזירות ריק ("אין מחירים") והשמירות נכשלות ("invalid roomId"),
 * ובנוסף רענון עם ה-refresh הישן היה כותב ל-DB access token של החשבון הלא נכון.
 */
import { createServiceRoleClient } from '@/lib/supabase/server'

export interface Beds24UserTokens {
  accessToken?: string
  refreshToken?: string
}

export interface UserTokenRow {
  beds24_token: string | null
  beds24_refresh_token: string | null
}

/**
 * פונקציה טהורה: מחליטה באילו טוקנים להשתמש לפי מה שנשמר ב-DB.
 * - שורה עם שני הטוקנים -> הטוקנים מה-DB (גוברים על מה שהועבר מהסשן).
 * - שורה בלי טוקנים מלאים -> `undefined`, כלומר חשבון ה-master (התנהגות ה-fallback הקיימת).
 * - אין שורה בכלל (שגיאת DB / משתמש לא נמצא) -> נשארים עם מה שהועבר.
 */
export function pickAuthoritativeTokens(
  row: UserTokenRow | null,
  provided: Beds24UserTokens | undefined,
): Beds24UserTokens | undefined {
  if (!row) return provided
  if (row.beds24_token && row.beds24_refresh_token) {
    return { accessToken: row.beds24_token, refreshToken: row.beds24_refresh_token }
  }
  return undefined
}

export async function loadUserTokenRow(userId: string): Promise<UserTokenRow | null> {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('users')
      .select('beds24_token, beds24_refresh_token')
      .eq('id', userId)
      .maybeSingle()
    if (error || !data) return null
    return data as UserTokenRow
  } catch (err) {
    console.warn('[Beds24] Failed to load user tokens from DB, using provided tokens:', err)
    return null
  }
}

/** הטוקנים בפועל לקריאת Beds24 עבור משתמש, עם ה-DB כמקור אמת. */
export async function resolveEffectiveUserTokens(
  userId: string,
  provided: Beds24UserTokens | undefined,
): Promise<Beds24UserTokens | undefined> {
  return pickAuthoritativeTokens(await loadUserTokenRow(userId), provided)
}

/** שמירת access token מרוענן ל-DB (service role — לא תלוי ב-RLS). */
export async function saveUserAccessToken(userId: string, accessToken: string): Promise<void> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('users').update({ beds24_token: accessToken }).eq('id', userId)
  if (error) throw new Error(error.message)
}
