/**
 * הגדרת המקטעים בעמוד "אזור אישי" והחלטה אילו מהם מוצגים למשתמש.
 */

export type ProfileSectionId =
  | 'details'
  | 'notifications'
  | 'channels'
  | 'checkin'
  | 'review'
  | 'receipts'
  | 'security'
  | 'subscription'

export interface ProfileSectionMeta {
  id: ProfileSectionId
  label: string
  description: string
}

export const PROFILE_SECTIONS: readonly ProfileSectionMeta[] = [
  { id: 'details', label: 'פרטים אישיים', description: 'שם, אימייל ופרטי הנכס שלך' },
  { id: 'notifications', label: 'התראות', description: 'לאן נשלחות התראות על הזמנות חדשות' },
  { id: 'channels', label: 'חיבור Airbnb', description: 'חיבור הנכס לחשבון Airbnb דרך Beds24' },
  { id: 'checkin', label: "צ'ק-אין דיגיטלי", description: 'מה האורח מקבל אחרי שמילא צ׳ק-אין' },
  { id: 'review', label: 'בקשת ביקורת', description: "הודעה אוטומטית אחרי צ'ק-אאוט" },
  { id: 'receipts', label: 'קבלות וחשבוניות', description: 'חיבור לספק מסמכי המס שלך' },
  { id: 'security', label: 'אבטחה', description: 'שינוי סיסמה' },
  { id: 'subscription', label: 'מנוי', description: 'סטטוס המנוי והחיוב' },
]

export interface SectionVisibilityFlags {
  hasProperty: boolean
  showSubscription: boolean
}

export function getVisibleSections(flags: SectionVisibilityFlags): ProfileSectionMeta[] {
  return PROFILE_SECTIONS.filter((section) => {
    if (section.id === 'channels') return flags.hasProperty
    if (section.id === 'subscription') return flags.showSubscription
    return true
  })
}

/** מנוי לא רלוונטי לאדמין ולמשתמש דמו. */
export function shouldShowSubscription(user: { role?: string; isDemo?: boolean } | undefined): boolean {
  return Boolean(user) && user?.role !== 'admin' && !user?.isDemo
}

/**
 * בוחר את המקטע הפעיל בניווט לפי המקטעים שנראים כרגע על המסך.
 * המקטע הראשון (לפי סדר הדף) שנראה גובר; אם אין כזה - נשאר הקודם.
 */
export function pickActiveSectionId(
  orderedIds: readonly string[],
  visibleIds: ReadonlySet<string>,
  previous: string,
): string {
  const firstVisible = orderedIds.find((id) => visibleIds.has(id))
  return firstVisible ?? previous
}
