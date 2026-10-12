'use client'

import { useState } from 'react'
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

  return (
    <StepPanel title="מחיר בסיס וזמינות" status={status} savedError={record?.error} actionError={error}>
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
        <button type="submit" className="btn btn-primary" disabled={running || price <= 0}>
          {running ? 'שומר...' : status === 'done' ? 'עדכן מחיר' : 'שמור מחיר'}
        </button>
      </form>
    </StepPanel>
  )
}
