import type { ComponentType } from 'react'
import type { PreviewModel } from '@/lib/landingBuilder/selectors'
import type { TemplateId } from '@/lib/landingBuilder/types'
import MinimalistModernTemplate from './MinimalistModernTemplate'
import CozyWarmTemplate from './CozyWarmTemplate'
import { SITE_FONT_CLASSES } from './siteFonts'

const TEMPLATE_COMPONENTS: Record<TemplateId, ComponentType<{ model: PreviewModel }>> = {
  'minimalist-modern': MinimalistModernTemplate,
  'cozy-warm': CozyWarmTemplate,
}

export default function TemplateRenderer({ model }: { model: PreviewModel }) {
  const Template = TEMPLATE_COMPONENTS[model.templateId]
  return (
    <div className={`${SITE_FONT_CLASSES} contents font-sans`}>
      <Template model={model} />
    </div>
  )
}
