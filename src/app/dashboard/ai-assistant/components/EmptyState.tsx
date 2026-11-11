import { Sparkles } from 'lucide-react'

const SUGGESTIONS = ['מה פנוי בסופ״ש הבא?', 'אילו לילות תפוסים בחודש הבא?', 'תחסום את חמישי ושישי הקרובים', 'תעדכן את המחיר בסופ״ש הבא ל־800']

interface EmptyStateProps {
  onPick: (text: string) => void
  disabled: boolean
}

export default function EmptyState({ onPick, disabled }: EmptyStateProps) {
  return (
    <div className="text-center my-auto py-4" data-testid="ai-assistant-empty">
      <Sparkles size={32} style={{ color: 'var(--hb)' }} />
      <p className="mt-3 mb-1 fw-semibold" style={{ color: 'var(--htxt-1)' }}>
        במה אפשר לעזור?
      </p>
      <p className="small mb-4" style={{ color: 'var(--htxt-3)' }}>
        שינויים בלוח השנה מתבצעים רק אחרי שתאשרו אותם.
      </p>
      <div className="d-flex flex-wrap justify-content-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="btn btn-sm btn-outline-secondary rounded-pill"
            onClick={() => onPick(suggestion)}
            disabled={disabled}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
