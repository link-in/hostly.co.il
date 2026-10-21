'use client'

import { Check } from 'lucide-react'
import { TEMPLATES, type TemplateMeta } from '@/lib/landingBuilder/templates'
import { useBuilderDispatch, useBuilderState } from '../../state/BuilderProvider'

function TemplateThumbnail({ template }: { template: TemplateMeta }) {
  const [ink, paper, accent] = template.swatches
  const corner = template.id === 'cozy-warm' ? 'rounded-lg' : 'rounded-sm'

  return (
    <div className="aspect-[4/3] overflow-hidden rounded-xl p-2" style={{ backgroundColor: paper }} aria-hidden>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="h-1.5 w-8 rounded-full" style={{ backgroundColor: ink }} />
        <span className="h-2 w-5 rounded-full" style={{ backgroundColor: accent }} />
      </div>
      <div className={`h-[45%] ${corner}`} style={{ backgroundColor: ink, opacity: 0.85 }} />
      <div className="mt-1.5 grid grid-cols-3 gap-1">
        {[0, 1, 2].map((cell) => (
          <span key={cell} className={`h-5 ${corner}`} style={{ backgroundColor: ink, opacity: 0.15 }} />
        ))}
      </div>
    </div>
  )
}

export default function TemplateStep() {
  const { draft } = useBuilderState()
  const dispatch = useBuilderDispatch()

  return (
    <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="תבנית עיצוב">
      {TEMPLATES.map((template) => {
        const selected = draft.templateId === template.id
        return (
          <button
            key={template.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => dispatch({ type: 'template/selected', templateId: template.id })}
            className={`relative cursor-pointer rounded-2xl bg-white p-2 text-right transition ${
              selected ? 'ring-2 ring-(--hb)' : 'ring-1 ring-slate-200 hover:ring-slate-300'
            }`}
          >
            {selected && (
              <span className="absolute left-3.5 top-3.5 z-10 grid size-5 place-items-center rounded-full bg-(--hb) text-white">
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </span>
            )}
            <TemplateThumbnail template={template} />
            <span className="mt-2 block px-1 text-sm font-semibold text-slate-900">{template.name}</span>
            <span className="block px-1 pb-1 text-xs leading-5 text-slate-500">{template.description}</span>
          </button>
        )
      })}
    </div>
  )
}
