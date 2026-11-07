import { format, parseISO } from 'date-fns'
import { he } from 'date-fns/locale'
import type { StayQuote } from '@/lib/landingBuilder/availability/nightlyRates'
import type { StayRange } from '@/lib/landingBuilder/dateRange'
import { formatMoney } from '@/lib/landingBuilder/pricing'

const formatDay = (iso: string | null) => (iso ? format(parseISO(iso), 'd בMMM', { locale: he }) : '—')

function DateBox({ label, iso }: { label: string; iso: string | null }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2.5 py-2">
      <span className="block text-[11px] text-slate-400">{label}</span>
      <span className="block text-sm font-medium text-slate-800">{formatDay(iso)}</span>
    </div>
  )
}

export function BookingSummary({ range, quote, currency }: { range: StayRange; quote: StayQuote; currency: string }) {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <DateBox label="צ׳ק-אין" iso={range.checkIn} />
        <DateBox label="צ׳ק-אאוט" iso={range.checkOut} />
      </div>
      {!quote.meetsMinStay && (
        <p role="status" className="text-center text-xs text-amber-700">
          מינימום {quote.minStay} לילות בתאריכים האלה.
        </p>
      )}
      {quote.meetsMinStay && quote.total !== null && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-sm">
          <span className="text-slate-500">{quote.nights} לילות</span>
          <span className="font-semibold text-slate-900">{formatMoney(quote.total, currency)}</span>
        </div>
      )}
    </div>
  )
}
