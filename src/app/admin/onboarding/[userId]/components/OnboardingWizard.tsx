'use client'

import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import type { OnboardingStepId } from '@/lib/onboarding/state'
import { createOnboardingApi, type OnboardingOverview } from '../onboardingApi'
import { ProgressList } from './ProgressList'
import type { StepStatus } from './stepMeta'
import type { StepProps } from './stepProps'
import { PropertyStep } from './PropertyStep'
import { BasePriceStep } from './BasePriceStep'
import { AirbnbConnectStep } from './AirbnbConnectStep'
import { AirbnbMultiplierStep } from './AirbnbMultiplierStep'
import { BookingComStep } from './BookingComStep'
import { VerifyStep } from './VerifyStep'
import { FinalizeStep } from './FinalizeStep'

const STEP_COMPONENTS: Record<OnboardingStepId, ComponentType<StepProps>> = {
  property: PropertyStep,
  basePrice: BasePriceStep,
  airbnbConnect: AirbnbConnectStep,
  airbnbMultiplier: AirbnbMultiplierStep,
  bookingCom: BookingComStep,
  verifyChannels: VerifyStep,
  finalize: FinalizeStep,
}

function firstOpenStep(overview: OnboardingOverview): OnboardingStepId {
  return overview.stepOrder.find((step) => {
    const status = overview.steps[step]?.status
    return status !== 'done' && status !== 'skipped'
  }) ?? 'finalize'
}

export function OnboardingWizard({ userId }: { userId: string }) {
  const api = useMemo(() => createOnboardingApi(userId), [userId])
  const [overview, setOverview] = useState<OnboardingOverview | null>(null)
  const [activeStep, setActiveStep] = useState<OnboardingStepId | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const next = await api.getOverview()
      setOverview(next)
      setLoadError(null)
      setActiveStep((current) => {
        if (!current) return firstOpenStep(next)
        const status = next.steps[current]?.status
        const advance = status === 'done' || status === 'skipped'
        return advance && current !== 'verifyChannels' && current !== 'finalize' ? firstOpenStep(next) : current
      })
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err))
    }
  }, [api])

  useEffect(() => {
    refresh()
  }, [refresh])

  if (loadError && !overview) {
    return <div className="alert alert-danger">{loadError}</div>
  }
  if (!overview || !activeStep) {
    return <div className="text-center py-5 text-white"><Loader2 size={32} className="spin" /></div>
  }

  const statusOf = (step: OnboardingStepId): StepStatus => overview.steps[step]?.status ?? 'pending'
  const ActiveComponent = STEP_COMPONENTS[activeStep]

  return (
    <div className="card border-0 shadow-lg" style={{ borderRadius: 16 }}>
      <div className="card-header border-0 text-white d-flex justify-content-between align-items-center"
        style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: '16px 16px 0 0', padding: '1.25rem 1.5rem' }}>
        <div>
          <h1 className="h5 mb-0 fw-bold">קליטת לקוח: {overview.client.displayName}</h1>
          <small className="opacity-75">{overview.client.email}</small>
        </div>
        <div className="d-flex align-items-center gap-2">
          {overview.client.completedAt && <span className="badge bg-success">פעיל</span>}
          <Link href="/admin/users" className="btn btn-light btn-sm">← לרשימת הלקוחות</Link>
        </div>
      </div>

      <div className="card-body p-0">
        <div className="row g-0">
          <div className="col-md-4 border-start p-3" style={{ background: '#fafbff' }}>
            <ProgressList stepOrder={overview.stepOrder} statusOf={statusOf} activeStep={activeStep} onSelect={setActiveStep} />
            {overview.credits?.remaining != null && (
              <p className="text-muted small mt-3 mb-0">
                קרדיטים שנותרו ב-Beds24: {overview.credits.remaining}{overview.credits.limit ? ` מתוך ${overview.credits.limit}` : ''}
              </p>
            )}
          </div>
          <div className="col-md-8 p-4">
            <ActiveComponent
              key={activeStep}
              api={api}
              overview={overview}
              record={overview.steps[activeStep]}
              status={statusOf(activeStep)}
              onChanged={refresh}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
