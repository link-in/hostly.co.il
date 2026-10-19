'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { PROPERTY_TYPES } from '@/lib/onboarding/schemas'
import type { PropertyStepData } from '@/lib/onboarding/service'
import { StepPanel } from './StepPanel'
import { AirbnbAuthLink } from './AirbnbAuthLink'
import { AirbnbListingPicker } from './AirbnbListingPicker'
import { ExistingPropertyPicker } from './ExistingPropertyPicker'
import { useStepAction } from './useStepAction'
import { readData, type StepProps } from './stepProps'

type Mode = 'create' | 'importAirbnb' | 'existing'

const MODE_LABELS: Record<Mode, string> = {
  create: 'יצירת נכס חדש',
  importAirbnb: 'ייבוא ממודעת Airbnb קיימת',
  existing: 'נכס קיים ב-Beds24',
}

const DONE_MESSAGES: Record<PropertyStepData['source'], string> = {
  created: 'הנכס והחדר נוצרו בקריאה אחת.',
  airbnbImport: 'הנכס יובא ממודעת Airbnb, והמודעה כבר מחוברת.',
  existing: 'חובר נכס קיים מחשבון ה-Beds24 של הלקוח.',
}

const PROPERTY_TYPE_LABELS: Record<(typeof PROPERTY_TYPES)[number], string> = {
  apartment: 'דירה',
  house: 'בית',
  villa: 'וילה',
  cabin: 'בקתה',
  guesthouse: 'צימר / בית הארחה',
  studio: 'סטודיו',
}

export function PropertyStep({ api, overview, record, status, onChanged }: StepProps) {
  const { running, error, run } = useStepAction(onChanged)
  const done = readData<PropertyStepData>(record)
  const [mode, setMode] = useState<Mode>(overview.usesOwnBeds24Account ? 'existing' : 'create')
  const [name, setName] = useState(overview.client.displayName)
  const [propertyType, setPropertyType] = useState<(typeof PROPERTY_TYPES)[number]>('apartment')
  const [maxPeople, setMaxPeople] = useState(2)

  if (status === 'done') {
    return (
      <StepPanel title="נכס וחדר ב-Beds24" status={status}>
        <div className="row g-2 text-center">
          <div className="col-6"><div className="text-muted small">מזהה נכס</div><code data-testid="property-id">{done.propertyId}</code></div>
          <div className="col-6"><div className="text-muted small">מזהה חדר</div><code data-testid="room-id">{done.roomId}</code></div>
        </div>
        <p className="text-muted small mt-3 mb-0">
          {DONE_MESSAGES[done.source ?? 'created']}
        </p>
      </StepPanel>
    )
  }

  return (
    <StepPanel title="נכס וחדר ב-Beds24" status={status} savedError={record?.error} actionError={error}>
      <div className="d-flex flex-wrap gap-2 mb-3" role="group">
        {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
          <Button key={m} type="button" size="sm" variant={mode === m ? 'primary' : 'outline'} aria-pressed={mode === m} onClick={() => setMode(m)}>
            {MODE_LABELS[m]}
          </Button>
        ))}
      </div>

      {mode === 'existing' ? (
        <>
          <p className="text-muted small">
            מתאים ללקוח שיש לו חשבון משנה ב-Beds24 עם נכס קיים. אם המודעה כבר מסונכרנת עם Airbnb, החיבור יזוהה אוטומטית.
          </p>
          {!overview.usesOwnBeds24Account && (
            <div className="alert alert-warning small">
              ללקוח אין טוקנים של חשבון משנה. הרשימה תציג את נכסי חשבון המאסטר.
            </div>
          )}
          <ExistingPropertyPicker
            api={api}
            disabled={running}
            onPick={(room) => run(() => api.createProperty({ mode: 'existing', ...room }))}
          />
        </>
      ) : mode === 'create' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            run(() => api.createProperty({ mode: 'create', name, propertyType, maxPeople, currency: 'ILS' }))
          }}
        >
          <div className="mb-3">
            <label className="form-label fw-semibold" htmlFor="property-name">שם הנכס</label>
            <input id="property-name" className="form-control" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </div>
          <div className="row g-3 mb-3">
            <div className="col-6">
              <label className="form-label fw-semibold" htmlFor="property-type">סוג</label>
              <select id="property-type" className="form-select" value={propertyType} onChange={(e) => setPropertyType(e.target.value as typeof propertyType)}>
                {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{PROPERTY_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div className="col-6">
              <label className="form-label fw-semibold" htmlFor="max-people">מקסימום אורחים</label>
              <input id="max-people" type="number" className="form-control" min={1} max={30} value={maxPeople} onChange={(e) => setMaxPeople(Number(e.target.value))} />
            </div>
          </div>
          <Button type="submit" variant="primary" loading={running} disabled={name.trim().length < 2}>
            {running ? 'יוצר...' : 'צור נכס וחדר'}
          </Button>
        </form>
      ) : (
        <>
          <p className="text-muted small">
            Beds24 תיצור את הנכס והחדר מתוך המודעה, ותחבר אותה מיד. מתאים ללקוח שכבר יש לו מודעה פעילה.
          </p>
          <h6 className="fw-semibold">שלב א – הרשאה מהלקוח</h6>
          <AirbnbAuthLink authUrl={overview.airbnbAuthUrl} />
          <h6 className="fw-semibold">שלב ב – בחירת המודעה</h6>
          <AirbnbListingPicker
            api={api}
            disabled={running}
            onPick={(listing) => run(() => api.createProperty({ mode: 'importAirbnb', ...listing }))}
          />
        </>
      )}
    </StepPanel>
  )
}
