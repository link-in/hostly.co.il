'use client'

import { ChevronLeft, ChevronRight, Rocket } from 'lucide-react'
import { BUILDER_STEPS } from '@/lib/landingBuilder/types'
import { useBuilderDispatch, useBuilderState } from '../../state/BuilderProvider'
import { BuilderButton } from '../ui/BuilderButton'

export default function WizardFooter() {
  const { activeStep } = useBuilderState()
  const dispatch = useBuilderDispatch()

  const index = BUILDER_STEPS.indexOf(activeStep)
  const isFirst = index === 0
  const isLast = index === BUILDER_STEPS.length - 1
  const goTo = (offset: number) => dispatch({ type: 'step/activated', step: BUILDER_STEPS[index + offset] })

  return (
    <footer className="flex items-center justify-between gap-2 border-t border-slate-100 bg-white px-6 py-3.5">
      <BuilderButton variant="ghost" disabled={isFirst} onClick={() => goTo(-1)} icon={<ChevronRight className="size-4" aria-hidden />}>
        הקודם
      </BuilderButton>
      <span className="text-xs text-slate-400">
        שלב {index + 1} מתוך {BUILDER_STEPS.length}
      </span>
      {isLast ? (
        <BuilderButton variant="primary" disabled title="פרסום האתר יתווסף בשלב הבא של הפיתוח" icon={<Rocket className="size-4" aria-hidden />}>
          פרסום האתר
        </BuilderButton>
      ) : (
        <BuilderButton variant="primary" onClick={() => goTo(1)}>
          הבא
          <ChevronLeft className="size-4" aria-hidden />
        </BuilderButton>
      )}
    </footer>
  )
}
