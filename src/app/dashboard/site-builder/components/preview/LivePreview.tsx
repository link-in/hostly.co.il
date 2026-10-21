'use client'

import { useMemo } from 'react'
import TemplateRenderer from '@/components/landing-templates/TemplateRenderer'
import { buildPreviewModel } from '@/lib/landingBuilder/selectors'
import { getTemplateMeta } from '@/lib/landingBuilder/templates'
import { useBuilderDispatch, useBuilderState } from '../../state/BuilderProvider'
import { BrowserFrame } from './BrowserFrame'
import { PreviewToolbar } from './PreviewToolbar'

const PREVIEW_HOST = 'your-site.hostly.co.il'

export default function LivePreview() {
  const { draft, previewDevice } = useBuilderState()
  const dispatch = useBuilderDispatch()
  const model = useMemo(() => buildPreviewModel(draft), [draft])

  return (
    <section
      aria-label="תצוגה חיה"
      className="flex min-h-[640px] flex-col gap-2.5 rounded-3xl bg-slate-200/50 p-2 ring-1 ring-slate-200/70 lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)] lg:p-6"
    >
      <PreviewToolbar
        templateName={getTemplateMeta(model.templateId).name}
        device={previewDevice}
        onDeviceChange={(device) => dispatch({ type: 'preview/deviceChanged', device })}
      />
      <div className="flex min-h-0 grow justify-center">
        <BrowserFrame device={previewDevice} host={PREVIEW_HOST}>
          <TemplateRenderer model={model} />
        </BrowserFrame>
      </div>
    </section>
  )
}
