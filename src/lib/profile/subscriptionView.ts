/**
 * תצוגה של מצב המנוי: תוויות בעברית וגוון צבע לפי הסטטוס.
 */

export type SubscriptionStatusValue = 'trial' | 'active' | 'cancelled' | 'expired'
export type SubscriptionBillingCycle = 'monthly' | 'annual'
export type StatusTone = 'success' | 'info' | 'warning' | 'danger'

const STATUS_VIEW: Record<SubscriptionStatusValue, { label: string; tone: StatusTone }> = {
  active: { label: 'פעיל', tone: 'success' },
  trial: { label: 'ניסיון', tone: 'info' },
  cancelled: { label: 'בוטל', tone: 'warning' },
  expired: { label: 'פג תוקף', tone: 'danger' },
}

export function subscriptionStatusView(status: SubscriptionStatusValue) {
  return STATUS_VIEW[status]
}

export function billingCycleLabel(cycle: SubscriptionBillingCycle | null): string | null {
  if (cycle === 'monthly') return 'חודשי — ₪150'
  if (cycle === 'annual') return 'שנתי — ₪1,000'
  return null
}

export function expiryLabel(status: SubscriptionStatusValue): string {
  return status === 'cancelled' ? 'גישה עד' : 'תוקף עד'
}

/** בניסיון שנגמר בעוד ימים ספורים מדגישים באדום. */
export function isTrialEndingSoon(status: SubscriptionStatusValue, daysRemaining: number): boolean {
  return status === 'trial' && daysRemaining <= 3
}

export function formatHebrewDate(iso: string | null): string | null {
  return iso ? new Date(iso).toLocaleDateString('he-IL') : null
}
