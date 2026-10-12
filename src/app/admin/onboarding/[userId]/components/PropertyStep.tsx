'use client'

import { useState } from 'react'
import { PROPERTY_TYPES } from '@/lib/onboarding/schemas'
import type { PropertyStepData } from '@/lib/onboarding/service'
import { StepPanel } from './StepPanel'
import { AirbnbListingPicker } from './AirbnbListingPicker'
import { useStepAction } from './useStepAction'
import { readData, type StepProps } from './stepProps'

type Mode = 'create' | 'importAirbnb'

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
  const [mode, setMode] = useState<Mode>('create')
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
          {done.source === 'airbnbImport' ? 'הנכס יובא ממודעת Airbnb, והמודעה כבר מחוברת.' : 'הנכס והחדר נוצרו בקריאה אחת.'}
        </p>
      </StepPanel>
    )
  }

  return (
    <StepPanel title="נכס וחדר ב-Beds24" status={status} savedError={record?.error} actionError={error}>
      <div className="btn-group mb-3" role="group">
        <button type="button" className={`btn btn-sm ${mode === 'create' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setMode('create')}>
          יצירת נכס חדש
        </button>
        <button type="button" className={`btn btn-sm ${mode === 'importAirbnb' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setMode('importAirbnb')}>
          ייבוא ממודעת Airbnb קיימת
        </button>
      </div>

      {mode === 'create' ? (
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
          <button type="submit" className="btn btn-primary" disabled={running || name.trim().length < 2}>
            {running ? 'יוצר...' : 'צור נכס וחדר'}
          </button>
        </form>
      ) : (
        <>
          <p className="text-muted small">
            Beds24 תיצור את הנכס והחדר מתוך המודעה, ותחבר אותה מיד. מתאים ללקוח שכבר יש לו מודעה פעילה.
          </p>
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
