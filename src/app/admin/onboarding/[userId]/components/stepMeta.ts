import type { OnboardingStepId } from '@/lib/onboarding/state'

export const STEP_LABELS: Record<OnboardingStepId, string> = {
  property: 'נכס וחדר',
  basePrice: 'מחיר בסיס',
  airbnbConnect: 'חיבור Airbnb',
  airbnbMultiplier: 'מכפיל Airbnb',
  bookingCom: 'Booking.com',
  verifyChannels: 'בדיקת חיבורים',
  finalize: 'הפעלה',
}

export type StepStatus = 'done' | 'failed' | 'skipped' | 'pending'

export const STATUS_LABELS: Record<StepStatus, string> = {
  done: 'הושלם',
  failed: 'נכשל',
  skipped: 'דולג',
  pending: 'ממתין',
}