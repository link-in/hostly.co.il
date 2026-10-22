'use client'

import type { ComponentType } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { isStepComplete } from '@/lib/landingBuilder/selectors'
import type { BuilderStep } from '@/lib/landingBuilder/types'
import { useBuilderDispatch, useBuilderState } from '../../state/BuilderProvider'
import { STEP_META } from './stepMeta'
import TemplateStep from '../steps/TemplateStep'
import ImportStep from '../steps/ImportStep'
import CustomizeStep from '../steps/CustomizeStep'
import PublishStep from '../steps/PublishStep'

const STEP_CONTENT: Record<BuilderStep, ComponentType> = {
  template: TemplateStep,
  import: ImportStep,
  customize: CustomizeStep,
  publish: PublishStep,
}

function StepBadge({ index, active, complete }: { index: number; active: boolean; complete: boolean }) {
  const tone = complete
    ? 'bg-emerald-500 text-white'
    : active
      ? 'bg-(--hb) text-white ring-4 ring-(--hb-100)'
      : 'bg-slate-100 text-slate-500'

  return (
    <span className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${tone}`}>
      {complete ? <Check className="size-4" strokeWidth={3} aria-hidden /> : index + 1}
    </span>
  )
}

export default function WizardStepper() {
  const { draft, activeStep } = useBuilderState()
  const dispatch = useBuilderDispatch()

  return (
    <ol className="mt-6 space-y-1">
      {STEP_META.map((step, index) => {
        const active = step.id === activeStep
        const complete = isStepComplete(draft, step.id)
        const isLast = index === STEP_META.length - 1
        const Content = STEP_CONTENT[step.id]

        return (
          <li key={step.id} className="relative">
            {!isLast && <span className="absolute bottom-0 right-6 top-12 w-px bg-slate-200" aria-hidden />}
            <button
              type="button"
              aria-current={active ? 'step' : undefined}
              aria-expanded={active}
              onClick={() => dispatch({ type: 'step/activated', step: step.id })}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-2xl px-2 py-2.5 text-right transition hover:bg-slate-50"
            >
              <StepBadge index={index} active={active} complete={complete} />
              <span className="grow">
                <span className="block text-sm font-semibold text-slate-900">{step.title}</span>
                <span className="block text-xs text-slate-500">{step.subtitle}</span>
              </span>
              <ChevronDown
                className={`size-4 text-slate-400 transition-transform ${active ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            {active && (
              <div className="pb-6 pl-1 pr-12 pt-2">
                <Content />
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
