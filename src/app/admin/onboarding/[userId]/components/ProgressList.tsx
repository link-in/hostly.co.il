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
  done: '#10b981',
  failed: '#dc2626',
  skipped: '#9ca3af',
  pending: '#e5e7eb',
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
              className="btn w-100 text-start d-flex align-items-center gap-2 py-2"
              style={{ background: isActive ? '#eef2ff' : 'transparent', borderRadius: 10 }}
              onClick={() => onSelect(step)}
              aria-current={isActive ? 'step' : undefined}
            >
              <span
                className="d-inline-flex align-items-center justify-content-center fw-bold"
                style={{
                  width: 26, height: 26, borderRadius: '50%', fontSize: 12, flexShrink: 0,
                  background: CIRCLE_BG[status], color: status === 'pending' ? '#6b7280' : 'white',
                }}
              >
                <StatusIcon status={status} index={index} />
              </span>
              <span className={isActive ? 'fw-bold' : ''} style={{ fontSize: 14 }}>{STEP_LABELS[step]}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
