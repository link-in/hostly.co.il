'use client'

import { Check, Save } from 'lucide-react'
import { useDraftPersistence } from '../../state/DraftPersistence'
import { BuilderButton } from '../ui/BuilderButton'

const timeFormatter = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' })

function savedTitle(savedAt: string | null): string {
  return savedAt ? `נשמר לאחרונה ב-${timeFormatter.format(new Date(savedAt))}` : 'הטיוטה עוד לא נשמרה'
}

export default function SaveDraftButton() {
  const { canSave, isDirty, isSaving, savedAt, save } = useDraftPersistence()

  if (!canSave) {
    return (
      <BuilderButton variant="secondary" disabled title="שמירה אינה זמינה במשתמש דמו" icon={<Save className="size-4" aria-hidden />}>
        שמירה
      </BuilderButton>
    )
  }

  const isSaved = !isDirty && savedAt !== null
  return (
    <BuilderButton
      variant="secondary"
      onClick={save}
      loading={isSaving}
      disabled={isSaved}
      title={savedTitle(savedAt)}
      aria-live="polite"
      icon={isSaved ? <Check className="size-4 text-emerald-600" aria-hidden /> : <Save className="size-4" aria-hidden />}
    >
      {isSaving ? 'שומר…' : isSaved ? 'נשמר' : 'שמירה'}
    </BuilderButton>
  )
}
