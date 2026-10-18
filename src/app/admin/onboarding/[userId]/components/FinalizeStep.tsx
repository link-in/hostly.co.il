'use client'

import { useState } from 'react'
import { Key } from 'lucide-react'
import { StepPanel } from './StepPanel'
import { useStepAction } from './useStepAction'
import { readData, type StepProps } from './stepProps'

export function FinalizeStep({ api, record, status, onChanged }: StepProps) {
  const { running, error, run } = useStepAction(onChanged)
  const data = readData<{ cachedDays: number; cacheWarning: string | null }>(record)
  const [apiKey, setApiKey] = useState<string | null>(null)

  async function finalize() {
    const res = await run(() => api.finalize())
    if (res?.apiKey) setApiKey(res.apiKey)
  }

  return (
    <StepPanel title="הפעלת הלקוח" status={status} savedError={record?.error} actionError={error}>
      {status !== 'done' ? (
        <>
          <p className="text-muted small">
            ממלא את מטמון הזמינות לשלושה חודשים, יוצר מפתח API ליומן הציבורי, ומסמן את הקליטה כהושלמה.
          </p>
          <button type="button" className="btn btn-success fw-bold" disabled={running} onClick={finalize}>
            {running ? 'מפעיל...' : 'הפעל לקוח'}
          </button>
        </>
      ) : (
        <div className="d-flex flex-column gap-3">
          <div className="alert alert-success small mb-0">
            הלקוח פעיל. נכתבו {data.cachedDays} ימים למטמון.
            {data.cacheWarning && <div className="text-warning mt-1">אזהרה: {data.cacheWarning}</div>}
          </div>
          {apiKey ? (
            <div className="p-3 rounded-3" style={{ background: '#fffbeb', border: '1px solid #fcd34d' }}>
              <div className="fw-semibold small mb-2"><Key size={14} className="ms-1" /> מפתח API – מוצג פעם אחת בלבד</div>
              <div className="input-group input-group-sm">
                <input readOnly className="form-control" value={apiKey} dir="ltr" data-testid="api-key" />
                <button type="button" className="btn btn-outline-warning" onClick={() => navigator.clipboard.writeText(apiKey)}>העתק</button>
              </div>
            </div>
          ) : (
            <p className="text-muted small mb-0">מפתח ה-API כבר נוצר. אפשר לנהל אותו במסך מפתחות ה-API של הלקוח.</p>
          )}
        </div>
      )}
    </StepPanel>
  )
}
