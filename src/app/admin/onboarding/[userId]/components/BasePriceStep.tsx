'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import type { PropertyStepData } from '@/lib/onboarding/service'
import type { BasePriceResult } from '@/lib/onboarding/steps/pricing'
import { StepPanel } from './StepPanel'
import { useStepAction } from './useStepAction'
import { readData, type StepProps } from './stepProps'

export function BasePriceStep({ api, overview, record, status, onChanged }: StepProps) {
  const { running, error, run } = useStepAction(onChanged)
  const done = readData<BasePriceResult>(record)
  const [price, setPrice] = useState<number>(done.price ?? 500)
  const [minStay, setMinStay] = useState<number>(done.minStay ?? 1)
  const airbnbPrice = Math.round(price * overview.airbnbMultiplier)
  const propertySource = readData<PropertyStepData>(overview.steps.property).source
  const canKeepExistingPrices = propertySource === 'existing' || propertySource === 'airbnbImport'

  return (
    <StepPanel title="מחיר בסיס וזמינות" status={status} savedError={record?.error} actionError={error}>
      {status === 'skipped' && (
        <div className="alert alert-secondary small">דולג – נשמרו המחירים שכבר קיימים ב-Beds24.</div>
      )}
      {status === 'done' && (
        <div className="alert alert-success small">
          מחיר {done.price} ללילה, מינימום {done.minStay} לילות, מ-{done.from} עד {done.to}.
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          run(() => api.setBasePrice({ price, minStay }))
        }}
      >
        <div className="row g-3 mb-2">
          <div className="col-6">
            <label className="form-label fw-semibold" htmlFor="base-price">מחיר ללילה (₪)</label>
            <input id="base-price" type="number" className="form-control" min={1} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </div>
          <div className="col-6">
            <label className="form-label fw-semibold" htmlFor="min-stay">מינימום לילות</label>
            <input id="min-stay" type="number" className="form-control" min={1} max={60} value={minStay} onChange={(e) => setMinStay(Number(e.target.value))} />
          </div>
        </div>
        <p className="text-muted small">
          המחיר ייקבע ל-12 החודשים הקרובים. ב-Airbnb המחיר יוצג כ-{airbnbPrice} ₪, אחרי מכפיל {overview.airbnbMultiplier}.
        </p>
        <div className="d-flex flex-wrap gap-2">
          <Button type="submit" variant="primary" loading={running} disabled={price <= 0}>
            {running ? 'שומר...' : status === 'done' ? 'עדכן מחיר' : 'שמור מחיר'}
          </Button>
          {canKeepExistingPrices && status !== 'done' && status !== 'skipped' && (
            <Button type="button" variant="ghost" size="sm" disabled={running} onClick={() => run(() => api.skip('basePrice'))}>
              המחירים כבר מוגדרים ב-Beds24 – דלג
            </Button>
          )}
        </div>
      </form>
    </StepPanel>
  )
}
