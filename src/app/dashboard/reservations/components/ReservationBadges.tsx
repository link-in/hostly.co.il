/**
 * תגיות תצוגה לעמוד "כל ההזמנות" — סטטוס, מקור והזמנה חדשה.
 * רכיבי תצוגה בלבד, ללא לוגיקה עסקית.
 */

import React from 'react'
import { Sparkles } from 'lucide-react'
import { formatStatus } from '@/lib/dashboard/utils'

// ─── Shared pill ──────────────────────────────────────────────────────────────

interface PillTone {
  color: string
  background: string
  border: string
}

function Pill({ tone, children, dashed = false }: { tone: PillTone; children: React.ReactNode; dashed?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 10px',
        borderRadius: 9999,
        fontSize: 11.5,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        color: tone.color,
        background: tone.background,
        border: `1px ${dashed ? 'dashed' : 'solid'} ${tone.border}`,
      }}
    >
      {children}
    </span>
  )
}

// ─── Status ───────────────────────────────────────────────────────────────────

const SUCCESS: PillTone = { color: '#15803d', background: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)' }
const DANGER: PillTone = { color: '#dc2626', background: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' }
const WARNING: PillTone = { color: '#b45309', background: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)' }
const NEUTRAL: PillTone = { color: 'var(--htxt-2)', background: 'var(--hn-100)', border: 'var(--hborder)' }

function statusTone(status: string): PillTone {
  if (status === 'confirmed') return SUCCESS
  if (status === 'cancelled') return DANGER
  if (status === 'pending' || status === 'request' || status === 'inquiry') return WARNING
  return NEUTRAL
}

export function ReservationStatusBadge({ status }: { status: string }) {
  // בקשה/בירור מסומנים בגבול מקווקו כדי להבדיל ממתין גם ללא צבע
  const dashed = status === 'request' || status === 'inquiry'
  return (
    <Pill tone={statusTone(status)} dashed={dashed}>
      {formatStatus(status)}
    </Pill>
  )
}

// ─── Source ───────────────────────────────────────────────────────────────────

const BOOKING: PillTone = { color: '#003580', background: 'rgba(0,53,128,0.08)', border: 'rgba(0,53,128,0.25)' }
const AIRBNB: PillTone = { color: '#d93a40', background: 'rgba(255,90,95,0.1)', border: 'rgba(255,90,95,0.35)' }

function sourceTone(source?: string): PillTone {
  const normalized = source?.toLowerCase() ?? ''
  if (normalized.includes('booking')) return BOOKING
  if (normalized.includes('airbnb')) return AIRBNB
  return NEUTRAL
}

export function ReservationSourceBadge({ source }: { source?: string }) {
  return <Pill tone={sourceTone(source)}>{source || 'לא ידוע'}</Pill>
}

// ─── New ──────────────────────────────────────────────────────────────────────

const BRAND: PillTone = { color: 'var(--hb)', background: 'var(--hb-100)', border: 'var(--hb-200)' }

export function NewReservationBadge() {
  return (
    <Pill tone={BRAND}>
      חדש
      <Sparkles size={11} />
    </Pill>
  )
}
