import React from 'react'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'

type Tone = { color: string; background: string; border: string }

const TONES: Record<string, { tone: Tone; label: string; icon: React.ReactNode }> = {
  completed: {
    label: 'הושלם',
    icon: <CheckCircle2 size={12} />,
    tone: { color: '#15803d', background: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)' },
  },
  pending: {
    label: 'ממתין',
    icon: <Clock size={12} />,
    tone: { color: '#b45309', background: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)' },
  },
  expired: {
    label: 'פג תוקף',
    icon: <XCircle size={12} />,
    tone: { color: '#dc2626', background: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
  },
}

const FALLBACK: Tone = { color: 'var(--htxt-2)', background: 'var(--hn-100)', border: 'var(--hborder)' }

/** תגית סטטוס צ'ק-אין — משותפת לרשימה ולעמוד הפרטים. */
export default function CheckInStatusBadge({ status }: { status?: string }) {
  const entry = status ? TONES[status] : undefined
  const tone = entry?.tone ?? FALLBACK

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
        border: `1px solid ${tone.border}`,
      }}
    >
      {entry?.icon}
      {entry?.label ?? status ?? '—'}
    </span>
  )
}
