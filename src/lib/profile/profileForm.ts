/**
 * הערה: הגדרות בקשת הביקורת מנוהלות באזור "הודעות WhatsApp" ולכן לא חלק מהטופס הזה
 * (וגם לא נשלחות בשמירה, כדי לא לדרוס ערכים שנערכו שם).
 *
 * לוגיקה טהורה של טופס "אזור אישי": ערכי התחלה מה-session, זיהוי שינויים,
 * ולידציה ובניית ה-payload לשרת. ללא תלות ב-React כדי שיהיה קל לבדוק.
 */
import { z } from 'zod'
import type { CheckInSettings } from '@/lib/auth/types'

export interface ProfileFormValues {
  displayName: string
  email: string
  landingPageUrl: string
  phoneNumber: string
  secondaryPhoneNumber: string
  wifiSsid: string
  wifiPassword: string
  propertyGuideUrl: string
  termsText: string
  liabilityWaiverText: string
  defaultAccessCode: string
}

export interface PasswordChange {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

/** החלק מה-session שהטופס קורא ממנו. */
export interface ProfileSourceUser {
  displayName?: string | null
  email?: string | null
  landingPageUrl?: string | null
  phoneNumber?: string | null
  secondaryPhoneNumber?: string | null
  checkInSettings?: CheckInSettings | null
}

export const MIN_PASSWORD_LENGTH = 6

export const EMPTY_PASSWORD_CHANGE: PasswordChange = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

export function profileFormFromUser(user: ProfileSourceUser | null | undefined): ProfileFormValues {
  const checkIn = user?.checkInSettings
  return {
    displayName: user?.displayName ?? '',
    email: user?.email ?? '',
    landingPageUrl: user?.landingPageUrl ?? '',
    phoneNumber: user?.phoneNumber ?? '',
    secondaryPhoneNumber: user?.secondaryPhoneNumber ?? '',
    wifiSsid: checkIn?.wifi_ssid ?? '',
    wifiPassword: checkIn?.wifi_password ?? '',
    propertyGuideUrl: checkIn?.property_guide_url ?? '',
    termsText: checkIn?.terms_text ?? '',
    liabilityWaiverText: checkIn?.liability_waiver_text ?? '',
    defaultAccessCode: checkIn?.default_access_code ?? '',
  }
}

export function trimProfileForm(values: ProfileFormValues): ProfileFormValues {
  const entries = Object.entries(values).map(([key, value]) => [key, value.trim()])
  return Object.fromEntries(entries) as unknown as ProfileFormValues
}

export function isProfileDirty(current: ProfileFormValues, baseline: ProfileFormValues): boolean {
  const keys = Object.keys(baseline) as (keyof ProfileFormValues)[]
  return keys.some((key) => current[key] !== baseline[key])
}

export function hasPasswordInput(password: PasswordChange): boolean {
  return Boolean(password.currentPassword || password.newPassword || password.confirmPassword)
}

const profileSubmissionSchema = z
  .object({
    displayName: z.string().trim().min(1, 'יש להזין שם תצוגה'),
    currentPassword: z.string(),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (!data.newPassword && !data.confirmPassword && !data.currentPassword) return

    if (!data.currentPassword) {
      ctx.addIssue({ code: 'custom', message: 'יש להזין את הסיסמה הנוכחית', path: ['currentPassword'] })
      return
    }
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({ code: 'custom', message: 'הסיסמאות אינן תואמות', path: ['confirmPassword'] })
      return
    }
    if (data.newPassword.length < MIN_PASSWORD_LENGTH) {
      ctx.addIssue({
        code: 'custom',
        message: `סיסמה חדשה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים`,
        path: ['newPassword'],
      })
    }
  })

/** מחזיר הודעת שגיאה בעברית, או null כשהטופס תקין. */
export function validateProfileSubmission(
  values: ProfileFormValues,
  password: PasswordChange,
): string | null {
  const result = profileSubmissionSchema.safeParse({ displayName: values.displayName, ...password })
  return result.success ? null : result.error.issues[0].message
}

function buildCheckInSettings(values: ProfileFormValues): CheckInSettings {
  return {
    wifi_ssid: values.wifiSsid.trim(),
    wifi_password: values.wifiPassword.trim(),
    property_guide_url: values.propertyGuideUrl.trim(),
    terms_text: values.termsText.trim(),
    liability_waiver_text: values.liabilityWaiverText.trim(),
    default_access_code: values.defaultAccessCode.trim(),
  }
}

/** גוף הבקשה ל-POST /api/auth/update-profile. */
export function buildUpdateProfileRequest(values: ProfileFormValues, password: PasswordChange) {
  return {
    displayName: values.displayName.trim(),
    email: values.email.trim(),
    landingPageUrl: values.landingPageUrl.trim(),
    phoneNumber: values.phoneNumber.trim(),
    secondaryPhoneNumber: values.secondaryPhoneNumber.trim(),
    checkInSettings: buildCheckInSettings(values),
    ...(password.newPassword
      ? { currentPassword: password.currentPassword, newPassword: password.newPassword }
      : {}),
  }
}

/** הנתונים שמעדכנים ב-session של next-auth אחרי שמירה מוצלחת (בלי סיסמאות ובלי אימייל). */
export function buildSessionPatch(values: ProfileFormValues) {
  return {
    displayName: values.displayName.trim(),
    landingPageUrl: values.landingPageUrl.trim(),
    phoneNumber: values.phoneNumber.trim(),
    secondaryPhoneNumber: values.secondaryPhoneNumber.trim(),
    checkInSettings: buildCheckInSettings(values),
  }
}
