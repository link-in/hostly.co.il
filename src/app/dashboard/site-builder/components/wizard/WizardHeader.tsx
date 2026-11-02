import { CalendarCheck, CreditCard, Sparkles, Wand2 } from 'lucide-react'

const VALUE_POINTS = [
  { icon: CalendarCheck, label: 'יומן מסונכרן' },
  { icon: Wand2, label: 'תוכן אוטומטי' },
  { icon: CreditCard, label: 'תשלום מאובטח' },
] as const

export default function WizardHeader() {
  return (
    <header className="px-3.5 pb-2 pt-4 sm:px-6 sm:pt-6">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-(--hb-50) px-2.5 py-1 text-xs font-semibold text-(--hb)">
        <Sparkles className="size-3.5" aria-hidden />
        בונה אתר הזמנות ישירות
      </span>
      <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">אתר משלכם, בלי עמלות ערוצים</h1>
      <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
        ארבעה צעדים לאתר הזמנות מעוצב עם יומן זמינות ותשלום מובנים. כל שינוי מופיע מיד בתצוגה החיה.
      </p>
      <ul className="mt-4 grid grid-cols-3 gap-1.5 sm:mt-6 sm:gap-2">
        {VALUE_POINTS.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex flex-col items-center gap-1 rounded-xl bg-slate-50 p-1.5 text-center text-[11px] font-medium leading-tight text-slate-600 sm:rounded-2xl sm:px-2 sm:py-2.5 sm:text-xs sm:leading-normal"
          >
            <Icon className="size-3.5 text-(--hb) sm:size-4" aria-hidden />
            {label}
          </li>
        ))}
      </ul>
    </header>
  )
}
