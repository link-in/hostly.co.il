import type { AssistantUIPart } from '@/lib/ai-assistant/ui/types'
import AvailabilityCard from './AvailabilityCard'
import ConfirmActionCard from './ConfirmActionCard'

const PROGRESS_LABELS: Record<string, string> = {
  'tool-list_properties': 'טוען את החדרים...',
  'tool-check_availability': 'בודק זמינות...',
  'tool-block_dates': 'מכין חסימה...',
  'tool-update_price': 'מכין עדכון מחיר...',
}

function Progress({ label }: { label: string }) {
  return (
    <div className="small d-flex align-items-center gap-2" style={{ color: 'var(--htxt-3)' }}>
      <span className="spinner-border spinner-border-sm" aria-hidden="true" />
      {label}
    </div>
  )
}

/** Failed tool outputs ({ ok: false }) render nothing: the assistant explains them in its reply. */
export default function ToolPartView({ part }: { part: AssistantUIPart }) {
  switch (part.type) {
    case 'tool-check_availability':
      if (part.state !== 'output-available') return <Progress label={PROGRESS_LABELS[part.type]} />
      return part.output.ok ? <AvailabilityCard result={part.output} /> : null

    case 'tool-block_dates':
    case 'tool-update_price':
      if (part.state !== 'output-available') return <Progress label={PROGRESS_LABELS[part.type]} />
      return part.output.ok ? <ConfirmActionCard proposal={part.output} /> : null

    case 'tool-list_properties':
      return part.state === 'output-available' ? null : <Progress label={PROGRESS_LABELS[part.type]} />

    default:
      return null
  }
}
