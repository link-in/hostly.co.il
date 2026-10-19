'use client'

import type { ReactNode } from 'react'
import { STATUS_LABELS, type StepStatus } from './stepMeta'

interface StepPanelProps {
  title: string
  status: StepStatus
  savedError?: string
  actionError?: string | null
  children: ReactNode
}

const STATUS_STYLES: Record<StepStatus, { background: string; color: string; border: string }> = {
  done: { background: '#DCFCE7', color: '#15803d', border: '#BBF7D0' },
  failed: { background: '#FEE2E2', color: '#dc2626', border: '#FECACA' },
  skipped: { background: 'var(--hn-100)', color: 'var(--htxt-3)', border: 'var(--hborder)' },
  pending: { background: 'var(--hb-50)', color: 'var(--hb)', border: 'var(--hb-200)' },
}

export function StepPanel({ title, status, savedError, actionError, children }: StepPanelProps) {
  const error = actionError ?? (status === 'failed' ? savedError : undefined)
  const badge = STATUS_STYLES[status]
  return (
    <div data-testid="step-panel">
      <div
        className="d-flex justify-content-between align-items-start gap-3 mb-4 pb-3"
        style={{ borderBottom: '1px solid var(--hborder-light)' }}
      >
        <div>
          <p className="mb-1 fw-semibold" style={{ color: 'var(--hb)', fontSize: 13 }}>שלב נוכחי</p>
          <h2 className="h4 fw-bold mb-0" style={{ color: 'var(--htxt-1)' }}>{title}</h2>
        </div>
        <span
          className="badge rounded-pill px-3 py-2"
          style={{
            background: badge.background,
            color: badge.color,
            border: `1px solid ${badge.border}`,
          }}
        >
          {STATUS_LABELS[status]}
        </span>
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
