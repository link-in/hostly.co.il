'use client'

import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2, UserPlus } from 'lucide-react'
import { Card, PageHeader } from '@/components/ui'
import type { OnboardingStepId } from '@/lib/onboarding/state'
import { createOnboardingApi, type OnboardingOverview } from '../onboardingApi'
import { ProgressList } from './ProgressList'
import { StatusBadge } from './StatusBadge'
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
    return <div className="text-center py-5" style={{ color: 'var(--hb)' }}><Loader2 size={32} className="spin" /></div>
  }

  const statusOf = (step: OnboardingStepId): StepStatus => overview.steps[step]?.status ?? 'pending'
  const ActiveComponent = STEP_COMPONENTS[activeStep]

  return (
    <>
      <PageHeader
        title={`קליטת לקוח: ${overview.client.displayName}`}
        subtitle={overview.client.email}
        icon={<UserPlus size={20} />}
        actions={
          <>
            {overview.client.completedAt && <StatusBadge status="done" label="פעיל" />}
            <Link href="/admin/users" className="hostly-btn hostly-btn-sm hostly-btn-on-light hostly-btn-ghost">
              <ArrowRight size={14} /> לרשימת הלקוחות
            </Link>
          </>
        }
      />

      <Card shadow>
        <div className="row g-0">
          <div
            className="col-md-4 p-3"
            style={{ background: 'var(--hsurf-2)', borderLeft: '1px solid var(--hborder-light)', borderRadius: '0 10px 10px 0' }}
          >
            <ProgressList stepOrder={overview.stepOrder} statusOf={statusOf} activeStep={activeStep} onSelect={setActiveStep} />
            <p className="small mt-3 mb-0" style={{ color: 'var(--htxt-2)' }} data-testid="beds24-account-mode">
              {overview.usesOwnBeds24Account ? 'עובד מול חשבון המשנה של הלקוח ב-Beds24' : 'עובד מול חשבון המאסטר ב-Beds24'}
            </p>
            {overview.credits?.remaining != null && (
              <p className="small mt-3 mb-0" style={{ color: 'var(--htxt-3)' }}>
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
      </Card>
    </>
  )
}
