'use client'

import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Gauge, Loader2, UserRound } from 'lucide-react'
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
    return <div className="text-center py-5" style={{ color: 'var(--hb)' }}><Loader2 size={32} className="spin" /></div>
  }

  const statusOf = (step: OnboardingStepId): StepStatus => overview.steps[step]?.status ?? 'pending'
  const ActiveComponent = STEP_COMPONENTS[activeStep]
  const completedCount = overview.stepOrder.filter((step) => {
    const status = statusOf(step)
    return status === 'done' || status === 'skipped'
  }).length
  const progress = Math.round((completedCount / overview.stepOrder.length) * 100)

  return (
    <div
      className="card shadow-sm"
      style={{
        borderRadius: 20,
        border: '1px solid var(--hborder)',
        overflow: 'hidden',
        background: 'var(--hsurf)',
      }}
    >
      <div
        className="card-header border-0"
        style={{
          background: 'linear-gradient(180deg, var(--hsurf), var(--hb-50))',
          padding: '1.5rem',
          borderBottom: '1px solid var(--hborder-light)',
        }}
      >
        <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 align-items-lg-start">
          <div className="d-flex align-items-start gap-3">
            <div
              className="d-flex align-items-center justify-content-center"
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                background: 'var(--hb-100)',
                color: 'var(--hb)',
                border: '1px solid var(--hb-200)',
                flexShrink: 0,
              }}
            >
              <UserRound size={23} />
            </div>
            <div>
              <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                <h1 className="h4 mb-0 fw-bold" style={{ color: 'var(--htxt-1)' }}>
                  קליטת לקוח: {overview.client.displayName}
                </h1>
                {overview.client.completedAt && (
                  <span className="badge d-inline-flex align-items-center gap-1" style={{ background: '#DCFCE7', color: '#15803d' }}>
                    <CheckCircle2 size={13} />
                    פעיל
                  </span>
                )}
              </div>
              <div style={{ color: 'var(--htxt-3)', fontSize: 14 }}>{overview.client.email}</div>
            </div>
          </div>
          <Link href="/admin/users" className="btn btn-outline-secondary d-inline-flex align-items-center gap-2 align-self-start">
            <ArrowLeft size={16} />
            לרשימת הלקוחות
          </Link>
        </div>

        <div className="row g-3 mt-4">
          <div className="col-md-8">
            <div className="d-flex justify-content-between align-items-center mb-2" style={{ color: 'var(--htxt-2)', fontSize: 13 }}>
              <span className="fw-semibold">התקדמות קליטה</span>
              <span>{completedCount} מתוך {overview.stepOrder.length} שלבים</span>
            </div>
            <div className="progress" style={{ height: 8, background: 'var(--hb-100)', borderRadius: 999 }}>
              <div
                className="progress-bar"
                style={{ width: `${progress}%`, background: 'var(--hb)', borderRadius: 999 }}
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
          {overview.credits?.remaining != null && (
            <div className="col-md-4">
              <div
                className="d-flex align-items-center gap-2 rounded-4 px-3 py-2 h-100"
                style={{ background: 'var(--hsurf)', border: '1px solid var(--hborder-light)' }}
              >
                <Gauge size={18} style={{ color: 'var(--hb)' }} />
                <div>
                  <div className="fw-semibold" style={{ fontSize: 13, color: 'var(--htxt-1)' }}>קרדיטים Beds24</div>
                  <div style={{ fontSize: 12, color: 'var(--htxt-3)' }}>
                    קרדיטים שנותרו ב-Beds24: {overview.credits.remaining}{overview.credits.limit ? ` מתוך ${overview.credits.limit}` : ''}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card-body p-0">
        <div className="row g-0">
          <div className="col-lg-4 border-start p-3 p-md-4" style={{ background: 'var(--hn-50)' }}>
            <ProgressList stepOrder={overview.stepOrder} statusOf={statusOf} activeStep={activeStep} onSelect={setActiveStep} />
          </div>
          <div className="col-lg-8 p-4 p-md-5">
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
