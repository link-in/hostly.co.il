import type { ConnectionStatus } from '../connections/types'
import type { CampaignStatus, StopReason, TriggerId } from '../domain/types'

export const TRIGGER_LABELS: Record<TriggerId, string> = {
  weekend: 'סוף שבוע פנוי (חמישי–שישי)',
  custom_window: 'כל תאריך פנוי',
}

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  pending_approval: 'ממתין לאישור',
  launching: 'מעלה…',
  active: 'פעיל',
  rejected: 'נדחה',
  stopped: 'נעצר',
  failed: 'נכשל',
  expired: 'הסתיים',
}

export const STOP_REASON_LABELS: Record<StopReason, string> = {
  booked: 'התאריכים נתפסו',
  window_started: 'תאריך ההגעה הגיע',
  manual: 'נעצר ידנית',
  connection_lost: 'החיבור נותק',
}

export const CONNECTION_STATUS_LABELS: Record<ConnectionStatus, string> = {
  pending_setup: 'צריך לבחור חשבון מודעות ועמוד',
  active: 'מחובר',
  expired: 'החיבור פג — צריך לחבר מחדש',
  revoked: 'מנותק',
}

const STATUS_TONES: Record<CampaignStatus, 'warning' | 'success' | 'muted' | 'danger'> = {
  pending_approval: 'warning',
  launching: 'warning',
  active: 'success',
  rejected: 'muted',
  stopped: 'muted',
  failed: 'danger',
  expired: 'muted',
}

export function campaignStatusTone(status: CampaignStatus) {
  return STATUS_TONES[status]
}

export function formatMoney(amount: number, currency = 'ILS'): string {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}
