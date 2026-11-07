import type { TemplateId } from '@/lib/landingBuilder/types'

export interface BookingTheme {
  card: string
  heading: string
  primaryButton: string
  selectedDay: string
  rangeDay: string
}

export const BOOKING_THEMES: Record<TemplateId, BookingTheme> = {
  'minimalist-modern': {
    card: 'rounded-2xl bg-white ring-1 ring-slate-200 shadow-xl shadow-slate-200/60',
    heading: 'font-semibold tracking-tight text-slate-900',
    primaryButton: 'rounded-xl bg-slate-900 text-white hover:bg-slate-800',
    selectedDay: 'rounded-lg bg-slate-900 text-white',
    rangeDay: 'bg-slate-100 text-slate-900',
  },
  'cozy-warm': {
    card: 'rounded-3xl bg-white ring-1 ring-amber-200/70 shadow-xl shadow-amber-900/10',
    heading: 'font-serif text-stone-900',
    primaryButton: 'rounded-full bg-amber-700 text-white hover:bg-amber-800',
    selectedDay: 'rounded-full bg-amber-700 text-white',
    rangeDay: 'bg-amber-100 text-amber-900',
  },
}
