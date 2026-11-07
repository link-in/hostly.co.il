'use client'

import { Button } from '@/components/ui'
import { StepPanel } from './StepPanel'
import { AirbnbAuthLink } from './AirbnbAuthLink'
import { AirbnbListingPicker } from './AirbnbListingPicker'
import { useStepAction } from './useStepAction'
import { readData, type StepProps } from './stepProps'

interface AirbnbConnectData {
  airbnbUserId: string
  airbnbListingId: string
  listingName: string | null
}

export function AirbnbConnectStep({ api, overview, record, status, onChanged }: StepProps) {
  const { running, error, run } = useStepAction(onChanged)
  const done = readData<AirbnbConnectData>(record)

  if (status === 'done') {
    return (
      <StepPanel title="חיבור מודעת Airbnb" status={status}>
        <div className="alert alert-success small mb-0">
          המודעה {done.listingName ? `"${done.listingName}" ` : ''}({done.airbnbListingId}) מחוברת לחדר בחיבור מלא.
        </div>
      </StepPanel>
    )
  }

  return (
    <StepPanel title="חיבור מודעת Airbnb" status={status} savedError={record?.error} actionError={error}>
      <h6 className="fw-semibold">שלב א – הרשאה מהלקוח</h6>
      <AirbnbAuthLink authUrl={overview.airbnbAuthUrl} />

      <h6 className="fw-semibold">שלב ב – בחירת המודעה</h6>
      <AirbnbListingPicker
        api={api}
        disabled={running}
        onPick={(listing) => run(() => api.connectAirbnb(listing))}
      />

      {status !== 'skipped' && (
        <Button type="button" variant="ghost" size="sm" className="mt-3" disabled={running} onClick={() => run(() => api.skip('airbnbConnect'))}>
          ללקוח אין Airbnb – דלג
        </Button>
      )}
    </StepPanel>
  )
}
