import { ArrowRight, Lock } from 'lucide-react'
import type { BookingTheme } from './bookingTheme'

const INPUT_CLASSES =
  'block w-full rounded-xl border-[1px] border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-slate-400'

/** Visual stand-in for the Cardcom checkout (lib/cardcom + booking_payments). */
export function CheckoutMock({ theme, onBack }: { theme: BookingTheme; onBack: () => void }) {
  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={onBack}
        className="flex cursor-pointer items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
      >
        <ArrowRight className="size-3.5" aria-hidden />
        חזרה ליומן
      </button>
      <input className={INPUT_CLASSES} placeholder="שם מלא" aria-label="שם מלא" />
      <input className={INPUT_CLASSES} placeholder="טלפון" aria-label="טלפון" type="tel" />
      <input className={INPUT_CLASSES} placeholder="אימייל" aria-label="אימייל" type="email" />
      <button
        type="button"
        className={`flex w-full cursor-pointer items-center justify-center gap-2 py-2.5 text-sm font-semibold ${theme.primaryButton}`}
      >
        <Lock className="size-4" aria-hidden />
        מעבר לתשלום מאובטח
      </button>
      <p className="text-center text-[11px] text-slate-400">התשלום מתבצע בסליקה מאובטחת · Cardcom</p>
    </div>
  )
}
