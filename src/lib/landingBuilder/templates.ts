import type { TemplateId } from './types'

export interface TemplateMeta {
  id: TemplateId
  name: string
  description: string
  /** Swatch colors shown on the template picker card. */
  swatches: readonly string[]
}

export const DEFAULT_TEMPLATE_ID: TemplateId = 'minimalist-modern'

export const TEMPLATES: readonly TemplateMeta[] = [
  {
    id: 'minimalist-modern',
    name: 'מינימליסטי מודרני',
    description: 'קווים נקיים, הרבה אוויר ודגש על התמונות',
    swatches: ['#0F172A', '#F8FAFC', '#7133D9'],
  },
  {
    id: 'cozy-warm',
    name: 'חמים ונעים',
    description: 'גוונים טבעיים, פינות מעוגלות ואווירה ביתית',
    swatches: ['#78350F', '#FFFBEB', '#D97706'],
  },
]

export function getTemplateMeta(id: TemplateId): TemplateMeta {
  const meta = TEMPLATES.find((template) => template.id === id)
  if (!meta) throw new Error(`Unknown landing template: ${id}`)
  return meta
}
