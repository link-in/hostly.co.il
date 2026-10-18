'use client'

import { Check, X, Minus } from 'lucide-react'
import type { OnboardingStepId } from '@/lib/onboarding/state'
import { STEP_LABELS, type StepStatus } from './stepMeta'

interface ProgressListProps {
  stepOrder: readonly OnboardingStepId[]
  statusOf: (step: OnboardingStepId) => StepStatus
  activeStep: OnboardingStepId
  onSelect: (step: OnboardingStepId) => void
}

function StatusIcon({ status, index }: { status: StepStatus; index: number }) {
  if (status === 'done') return <Check size={14} />
  if (status === 'failed') return <X size={14} />
  if (status === 'skipped') return <Minus size={14} />
  return <span>{index + 1}</span>
}

const CIRCLE_BG: Record<StepStatus, string> = {
  done: '#DCFCE7',
  failed: '#FEE2E2',
  skipped: '#F2F6FA',
  pending: '#FFFFFF',
}

const CIRCLE_COLOR: Record<StepStatus, string> = {
  done: '#15803d',
  failed: '#dc2626',
  skipped: 'var(--htxt-3)',
  pending: 'var(--htxt-3)',
}

export function ProgressList({ stepOrder, statusOf, activeStep, onSelect }: ProgressListProps) {
  return (
    <ol className="list-unstyled mb-0 d-flex flex-column gap-1">
      {stepOrder.map((step, index) => {
        const status = statusOf(step)
        const isActive = step === activeStep
        return (
          <li key={step}>
            <button
              type="button"
              className="btn w-100 text-start d-flex align-items-center gap-3 py-2 px-2"
              style={{
                background: isActive ? 'var(--hsurf)' : 'transparent',
                borderRadius: 14,
                border: isActive ? '1px solid var(--hb-200)' : '1px solid transparent',
                boxShadow: isActive ? '0 10px 22px rgba(47,49,51,0.06)' : 'none',
                color: isActive ? 'var(--htxt-1)' : 'var(--htxt-2)',
              }}
              onClick={() => onSelect(step)}
              aria-current={isActive ? 'step' : undefined}
            >
              <span
                className="d-inline-flex align-items-center justify-content-center fw-bold"
                style={{
                  width: 30, height: 30, borderRadius: '50%', fontSize: 12, flexShrink: 0,
                  background: isActive && status === 'pending' ? 'var(--hb-100)' : CIRCLE_BG[status],
                  color: isActive && status === 'pending' ? 'var(--hb)' : CIRCLE_COLOR[status],
                  border: status === 'pending' ? '1px solid var(--hborder)' : '1px solid transparent',
                }}
              >
                <StatusIcon status={status} index={index} />
              </span>
              <span className={isActive ? 'fw-bold' : 'fw-semibold'} style={{ fontSize: 14 }}>{STEP_LABELS[step]}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
