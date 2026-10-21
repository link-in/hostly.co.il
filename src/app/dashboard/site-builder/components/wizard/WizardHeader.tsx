import { CalendarCheck, CreditCard, Sparkles, Wand2 } from 'lucide-react'

const VALUE_POINTS = [
  { icon: CalendarCheck, label: 'יומן זמינות מסונכרן' },
  { icon: Wand2, label: 'תוכן אוטומטי' },
  { icon: CreditCard, label: 'תשלום מאובטח' },
] as const

export default function WizardHeader() {
  return (
    <header className="px-6 pb-2 pt-6">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-(--hb-50) px-2.5 py-1 text-xs font-semibold text-(--hb)">
        <Sparkles className="size-3.5" aria-hidden />
        בונה אתר הזמנות ישירות
      </span>
      <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900">אתר משלכם, בלי עמלות ערוצים</h1>
      <p className="mt-1.5 text-sm leading-6 text-slate-500">
        שלושה צעדים לאתר הזמנות מעוצב עם יומן זמינות ותשלום מובנים. כל שינוי מופיע מיד בתצוגה החיה.
      </p>
      <ul className="mt-6 grid grid-cols-3 gap-2">
        {VALUE_POINTS.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-slate-50 px-2 py-2.5 text-center text-xs font-medium text-slate-600"
          >
            <Icon className="size-4 text-(--hb)" aria-hidden />
            {label}
          </li>
        ))}
      </ul>
    </header>
  )
}
