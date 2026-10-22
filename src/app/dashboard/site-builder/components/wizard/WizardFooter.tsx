'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { BUILDER_STEPS } from '@/lib/landingBuilder/types'
import { useBuilderDispatch, useBuilderState } from '../../state/BuilderProvider'
import { useDraftPersistence } from '../../state/DraftPersistence'
import { useSitePublishing } from '../../state/SitePublishing'
import { BuilderButton } from '../ui/BuilderButton'
import PublishButton from './PublishButton'
import SaveDraftButton from './SaveDraftButton'

function FooterError() {
  const { error: saveError } = useDraftPersistence()
  const { error: publishError } = useSitePublishing()
  const error = saveError ?? publishError
  if (!error) return null
  return (
    <p role="alert" className="border-t border-red-100 bg-red-50 px-6 py-2 text-xs text-red-700">
      {error}
    </p>
  )
}

export default function WizardFooter() {
  const { activeStep } = useBuilderState()
  const dispatch = useBuilderDispatch()

  const index = BUILDER_STEPS.indexOf(activeStep)
  const isFirst = index === 0
  const isLast = index === BUILDER_STEPS.length - 1
  const goTo = (offset: number) => dispatch({ type: 'step/activated', step: BUILDER_STEPS[index + offset] })

  return (
    <div>
      <FooterError />
      <footer className="flex items-center justify-between gap-2 border-t border-slate-100 bg-white px-6 py-3.5">
        <BuilderButton variant="ghost" disabled={isFirst} onClick={() => goTo(-1)} icon={<ChevronRight className="size-4" aria-hidden />}>
          הקודם
        </BuilderButton>
        <SaveDraftButton />
        {isLast ? (
          <PublishButton />
        ) : (
          <BuilderButton variant="primary" onClick={() => goTo(1)}>
            הבא
            <ChevronLeft className="size-4" aria-hidden />
          </BuilderButton>
        )}
      </footer>
    </div>
  )
}
