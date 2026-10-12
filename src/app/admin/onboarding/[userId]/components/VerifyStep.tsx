'use client'

import type { AccountChannelLinks, AirbnbRoomStatus } from '@/lib/onboarding/steps/channels'
import { StepPanel } from './StepPanel'
import { useStepAction } from './useStepAction'
import { readData, type StepProps } from './stepProps'

interface VerifyData {
  airbnb: AirbnbRoomStatus | null
  multiplierMatches: boolean | null
  accountLinks: AccountChannelLinks
  checkedAt: string
}

function CheckRow({ ok, label }: { ok: boolean | null; label: string }) {
  const icon = ok === null ? '–' : ok ? '✓' : '✗'
  const color = ok === null ? 'text-muted' : ok ? 'text-success' : 'text-danger'
  return <li className={`small ${color}`}><strong className="ms-1">{icon}</strong> {label}</li>
}

export function VerifyStep({ api, overview, record, status, onChanged }: StepProps) {
  const { running, error, run } = useStepAction(onChanged)
  const data = readData<VerifyData>(record)
  const bookingExpected = overview.steps.bookingCom?.status === 'done'

  return (
    <StepPanel title="בדיקת חיבורים מול Beds24" status={status} savedError={record?.error} actionError={error}>
      <p className="text-muted small">
        הבדיקה קוראת בחזרה מ-Beds24 את מיפוי Airbnb ואת המכפיל, ואת מספר החיבורים הפעילים בחשבון.
        ל-Booking.com אין בדיקה ברמת הנכס, ולכן מוצג המספר הכולל בחשבון.
      </p>
      {data.accountLinks && (
        <ul className="list-unstyled mb-3" data-testid="verify-results">
          {data.airbnb ? (
            <>
              <CheckRow ok={data.airbnb.connected} label={`מודעת Airbnb מחוברת לחדר${data.airbnb.airbnbListingId ? ` (${data.airbnb.airbnbListingId})` : ''}`} />
              <CheckRow ok={data.multiplierMatches ?? null} label={`מכפיל Airbnb בפועל: ${data.airbnb.multiplier ?? 'לא הוגדר'}`} />
            </>
          ) : (
            <CheckRow ok={null} label="Airbnb לא נבדק, כי השלב דולג" />
          )}
          <CheckRow ok={null} label={`חיבורי Airbnb פעילים בחשבון: ${data.accountLinks.airbnb}`} />
          <CheckRow
            ok={bookingExpected ? data.accountLinks.booking > 0 : null}
            label={`חיבורי Booking.com פעילים בחשבון: ${data.accountLinks.booking}`}
          />
          {data.checkedAt && (
            <li className="small text-muted mt-1">נבדק ב-{new Date(data.checkedAt).toLocaleString('he-IL')}</li>
          )}
        </ul>
      )}
      <button type="button" className="btn btn-primary" disabled={running} onClick={() => run(() => api.verify())}>
        {running ? 'בודק...' : status === 'done' ? 'בדוק שוב' : 'הרץ בדיקה'}
      </button>
    </StepPanel>
  )
}
