'use client'

import { Button } from '@/components/ui'
import { StepPanel } from './StepPanel'
import { useStepAction } from './useStepAction'
import type { StepProps } from './stepProps'

export function AirbnbMultiplierStep({ api, overview, record, status, onChanged }: StepProps) {
  const { running, error, run } = useStepAction(onChanged)
  const airbnbConnected = overview.steps.airbnbConnect?.status === 'done'

  return (
    <StepPanel title="מכפיל מחיר ל-Airbnb" status={status} savedError={record?.error} actionError={error}>
      <p className="text-muted small">
        המכפיל {overview.airbnbMultiplier} מכסה את עמלת Airbnb ואת העמלות הנלוות. הוא נקבע ב-Beds24 ברמת הנכס,
        כך שכל עדכון מחיר עתידי יעבור אליו אוטומטית.
      </p>
      {status === 'skipped' && <div className="alert alert-secondary small">דולג כי הלקוח לא מחובר ל-Airbnb.</div>}
      {status !== 'skipped' && (
        <Button
          type="button"
          variant="primary"
          loading={running}
          disabled={!airbnbConnected}
          onClick={() => run(() => api.applyAirbnbMultiplier())}
        >
          {running ? 'שומר...' : status === 'done' ? 'החל שוב' : `החל מכפיל ${overview.airbnbMultiplier}`}
        </Button>
      )}
      {!airbnbConnected && status !== 'skipped' && (
        <p className="text-muted small mt-2 mb-0">יש לחבר מודעת Airbnb קודם.</p>
      )}
    </StepPanel>
  )
}
