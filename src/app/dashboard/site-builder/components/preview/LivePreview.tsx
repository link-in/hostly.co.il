'use client'

import { useCallback, useMemo, useState } from 'react'
import TemplateRenderer from '@/components/landing-templates/TemplateRenderer'
import { buildPreviewModel } from '@/lib/landingBuilder/selectors'
import { buildSiteHost } from '@/lib/landingBuilder/siteAddress'
import { getTemplateMeta } from '@/lib/landingBuilder/templates'
import type { PreviewDevice } from '@/lib/landingBuilder/types'
import { useBuilderDispatch, useBuilderState } from '../../state/BuilderProvider'
import { BrowserFrame } from './BrowserFrame'
import FullScreenPreview from './FullScreenPreview'
import { PreviewToolbar } from './PreviewToolbar'

const PLACEHOLDER_ADDRESS = 'your-site'

export default function LivePreview() {
  const { draft, previewDevice } = useBuilderState()
  const dispatch = useBuilderDispatch()
  const model = useMemo(() => buildPreviewModel(draft), [draft])
  const [isFullScreen, setIsFullScreen] = useState(false)

  const changeDevice = (device: PreviewDevice) => dispatch({ type: 'preview/deviceChanged', device })
  const closeFullScreen = useCallback(() => setIsFullScreen(false), [])

  return (
    <section
      aria-label="תצוגה חיה"
      className="flex min-h-[640px] flex-col gap-2.5 rounded-3xl bg-slate-200/50 p-2 ring-1 ring-slate-200/70 lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)] lg:p-6"
    >
      <PreviewToolbar
        templateName={getTemplateMeta(model.templateId).name}
        device={previewDevice}
        onDeviceChange={changeDevice}
        onOpenFullScreen={() => setIsFullScreen(true)}
      />
      <div className="flex min-h-0 grow justify-center">
        <BrowserFrame device={previewDevice} host={buildSiteHost(draft.siteAddress || PLACEHOLDER_ADDRESS)}>
          <TemplateRenderer model={model} />
        </BrowserFrame>
      </div>
      {isFullScreen && (
        <FullScreenPreview model={model} device={previewDevice} onDeviceChange={changeDevice} onClose={closeFullScreen} />
      )}
    </section>
  )
}
