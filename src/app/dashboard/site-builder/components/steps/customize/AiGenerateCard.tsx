'use client'

import { Wand2 } from 'lucide-react'
import { useBuilderState } from '../../../state/BuilderProvider'
import { BuilderButton } from '../../ui/BuilderButton'
import { SoonBadge } from '../../ui/Fields'

export default function AiGenerateCard() {
  const { draft } = useBuilderState()
  const hasSourceData = draft.propertyId !== null

  return (
    <div className="rounded-2xl bg-linear-to-l from-(--hb-50) to-white p-2.5 ring-1 ring-(--hb-200)">
      <div className="flex items-start gap-2.5 px-1 pb-2.5 pt-1">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-(--hb) text-white">
          <Wand2 className="size-4" aria-hidden />
        </span>
        <span className="grow">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            יצירה אוטומטית עם AI
            <SoonBadge />
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-slate-500">
            כותרת מושכת, טקסט שיווקי, תמונת שער ופריסה מומלצת — על בסיס נתוני הנכס שיובאו.
          </span>
        </span>
      </div>
      <BuilderButton
        variant="secondary"
        fullWidth
        disabled
        title={hasSourceData ? 'יתווסף בשלב 5 של הפיתוח' : 'יש לייבא קודם את נתוני הנכס'}
        icon={<Wand2 className="size-4" aria-hidden />}
      >
        צרו לי את האתר
      </BuilderButton>
    </div>
  )
}
