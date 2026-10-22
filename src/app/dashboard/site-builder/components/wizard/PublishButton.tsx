'use client'

import { Check, Rocket } from 'lucide-react'
import { PUBLISH_BLOCKER_MESSAGES } from '@/lib/landingBuilder/publishing/publishBlockers'
import { useDraftPersistence } from '../../state/DraftPersistence'
import { useSitePublishing } from '../../state/SitePublishing'
import { BuilderButton } from '../ui/BuilderButton'

function publishLabel(isPublishing: boolean, isPublished: boolean, isUpToDate: boolean): string {
  if (isPublishing) return 'מפרסם…'
  if (isUpToDate) return 'האתר מעודכן'
  return isPublished ? 'עדכון האתר' : 'פרסום האתר'
}

export default function PublishButton() {
  const { canSave, isSaving } = useDraftPersistence()
  const { published, hasUnpublishedChanges, blockers, isPublishing, publish } = useSitePublishing()

  const isUpToDate = published !== null && !hasUnpublishedChanges
  const title = !canSave
    ? 'פרסום אינו זמין במשתמש דמו'
    : blockers.length > 0
      ? PUBLISH_BLOCKER_MESSAGES[blockers[0]]
      : undefined

  return (
    <BuilderButton
      variant="primary"
      onClick={publish}
      loading={isPublishing}
      disabled={!canSave || blockers.length > 0 || isSaving || isUpToDate}
      title={title}
      icon={isUpToDate ? <Check className="size-4" aria-hidden /> : <Rocket className="size-4" aria-hidden />}
    >
      {publishLabel(isPublishing, published !== null, isUpToDate)}
    </BuilderButton>
  )
}
