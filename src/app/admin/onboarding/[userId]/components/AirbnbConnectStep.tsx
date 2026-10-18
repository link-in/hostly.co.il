'use client'

import { useState } from 'react'
import { Copy, ExternalLink } from 'lucide-react'
import { StepPanel } from './StepPanel'
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
  const [copied, setCopied] = useState(false)

  if (status === 'done') {
    return (
      <StepPanel title="חיבור מודעת Airbnb" status={status}>
        <div className="alert alert-success small mb-0">
          המודעה {done.listingName ? `"${done.listingName}" ` : ''}({done.airbnbListingId}) מחוברת לחדר בחיבור מלא.
        </div>
      </StepPanel>
    )
  }

  async function copyLink() {
    await navigator.clipboard.writeText(overview.airbnbAuthUrl)
    setCopied(true)
  }

  return (
    <StepPanel title="חיבור מודעת Airbnb" status={status} savedError={record?.error} actionError={error}>
      <h6 className="fw-semibold">שלב א – הרשאה מהלקוח</h6>
      <p className="text-muted small">
        שלח ללקוח את הקישור. הוא מתחבר ל-Airbnb ומאשר גישה, ואז חשבון ה-Airbnb שלו יופיע ברשימה למטה.
        רק בעל המודעה יכול לאשר, לא מארח משותף.
      </p>
      <div className="d-flex gap-2 mb-4">
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={copyLink}>
          <Copy size={14} className="ms-1" /> {copied ? 'הועתק' : 'העתק קישור הרשאה'}
        </button>
        <a className="btn btn-outline-secondary btn-sm" href={overview.airbnbAuthUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={14} className="ms-1" /> פתח
        </a>
      </div>

      <h6 className="fw-semibold">שלב ב – בחירת המודעה</h6>
      <AirbnbListingPicker
        api={api}
        disabled={running}
        onPick={(listing) => run(() => api.connectAirbnb(listing))}
      />

      {status !== 'skipped' && (
        <button type="button" className="btn btn-link btn-sm text-muted mt-3 p-0" disabled={running} onClick={() => run(() => api.skip('airbnbConnect'))}>
          ללקוח אין Airbnb – דלג
        </button>
      )}
    </StepPanel>
  )
}
