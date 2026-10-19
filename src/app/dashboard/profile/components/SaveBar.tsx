import { Check } from 'lucide-react'
import { Button } from '@/components/ui'

interface SaveBarProps {
  saving: boolean
  error: string | null
  onSave: () => void
  onCancel: () => void
}

/** מופיע רק כשיש שינויים שלא נשמרו; דביק בתחתית המסך כדי שתמיד יהיה בהישג יד. */
export function SaveBar({ saving, error, onSave, onCancel }: SaveBarProps) {
  return (
    <div className="profile-savebar" role="region" aria-label="שמירת שינויים">
      <div>
        <div className="profile-savebar-text">יש שינויים שלא נשמרו</div>
        {error ? (
          <div className="profile-savebar-error" role="alert">
            {error}
          </div>
        ) : null}
      </div>
      <div className="profile-actions">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          ביטול
        </Button>
        <Button
          variant="primary"
          className="profile-cta"
          onClick={onSave}
          loading={saving}
          iconStart={<Check size={15} />}
        >
          {saving ? 'שומר…' : 'שמירת שינויים'}
        </Button>
      </div>
    </div>
  )
}
