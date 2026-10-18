import type { ReactNode } from 'react'

export type AlertTone = 'success' | 'danger' | 'info'

interface InlineAlertProps {
  tone: AlertTone
  children: ReactNode
}

export function InlineAlert({ tone, children }: InlineAlertProps) {
  return (
    <div className={`profile-alert profile-alert--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}

interface ResultAlertsProps {
  message?: string | null
  error?: string | null
}

/** מציג הודעת הצלחה ו/או שגיאה של פעולה (אם יש). */
export function ResultAlerts({ message, error }: ResultAlertsProps) {
  if (!message && !error) return null
  return (
    <>
      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
      {message ? <InlineAlert tone="success">{message}</InlineAlert> : null}
    </>
  )
}
