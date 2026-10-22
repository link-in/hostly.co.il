import { DownloadCloud, Globe, LayoutTemplate, PenLine, type LucideIcon } from 'lucide-react'
import type { BuilderStep } from '@/lib/landingBuilder/types'

export interface StepMeta {
  id: BuilderStep
  title: string
  subtitle: string
  icon: LucideIcon
}

export const STEP_META: readonly StepMeta[] = [
  { id: 'template', title: 'בחירת תבנית', subtitle: 'העיצוב הבסיסי של האתר', icon: LayoutTemplate },
  { id: 'import', title: 'ייבוא נתונים', subtitle: 'תמונות, תיאור ומתקנים מהערוצים', icon: DownloadCloud },
  { id: 'customize', title: 'התאמה אישית', subtitle: 'טקסטים ותמונות — ב-AI או ידנית', icon: PenLine },
  { id: 'publish', title: 'כתובת ופרסום', subtitle: 'הכתובת שבה האורחים ימצאו את האתר', icon: Globe },
]
