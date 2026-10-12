'use client'

import type { ReactNode } from 'react'
import { STATUS_BADGE_CLASS, STATUS_LABELS, type StepStatus } from './stepMeta'

interface StepPanelProps {
  title: string
  status: StepStatus
  savedError?: string
  actionError?: string | null
  children: ReactNode
}

export function StepPanel({ title, status, savedError, actionError, children }: StepPanelProps) {
  const error = actionError ?? (status === 'failed' ? savedError : undefined)
  return (
    <div data-testid="step-panel">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold mb-0">{title}</h5>
        <span className={`badge ${STATUS_BADGE_CLASS[status]}`}>{STATUS_LABELS[status]}</span>
      </div>
      {error && (
        <div className="alert alert-danger small" role="alert">
          <strong>שגיאה:</strong> {error}
        </div>
      )}
      {children}
    </div>
  )
}
