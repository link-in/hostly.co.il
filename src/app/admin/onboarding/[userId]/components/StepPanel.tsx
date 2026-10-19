'use client'

import type { ReactNode } from 'react'
import { type StepStatus } from './stepMeta'
import { StatusBadge } from './StatusBadge'

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
        <h5 className="mb-0" style={{ color: 'var(--htxt-1)', fontWeight: 700 }}>{title}</h5>
        <StatusBadge status={status} />
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
