import { colors } from '@/lib/design-system'
import { STATUS_LABELS, type StepStatus } from './stepMeta'

interface BadgeColors {
  background: string
  color: string
}

const BADGE_COLORS: Record<StepStatus, BadgeColors> = {
  done: { background: colors.semantic.successLight, color: '#15803d' },
  failed: { background: colors.semantic.dangerLight, color: '#b91c1c' },
  skipped: { background: colors.neutral[100], color: colors.neutral[700] },
  pending: { background: colors.brand[50], color: colors.brand.DEFAULT },
}

interface StatusBadgeProps {
  status: StepStatus
  /** Overrides the default Hebrew label of the status. */
  label?: string
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span
      className="d-inline-flex align-items-center"
      style={{
        ...BADGE_COLORS[status],
        borderRadius: 9999,
        padding: '2px 10px',
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.6,
      }}
    >
      {label ?? STATUS_LABELS[status]}
    </span>
  )
}
