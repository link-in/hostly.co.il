import { format, parseISO } from 'date-fns'
import { he } from 'date-fns/locale'
import { countNights, type StayRange } from '@/lib/landingBuilder/dateRange'
import { calculateStayTotal, formatMoney } from '@/lib/landingBuilder/pricing'
import type { LandingDraft } from '@/lib/landingBuilder/types'

const formatDay = (iso: string | null) => (iso ? format(parseISO(iso), 'd בMMM', { locale: he }) : '—')

function DateBox({ label, iso }: { label: string; iso: string | null }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2.5 py-2">
      <span className="block text-[11px] text-slate-400">{label}</span>
      <span className="block text-sm font-medium text-slate-800">{formatDay(iso)}</span>
    </div>
  )
}

export function BookingSummary({ range, booking }: { range: StayRange; booking: LandingDraft['booking'] }) {
  const nights = countNights(range)
  const total = calculateStayTotal(booking.basePrice, nights)

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <DateBox label="צ׳ק-אין" iso={range.checkIn} />
        <DateBox label="צ׳ק-אאוט" iso={range.checkOut} />
      </div>
      {total !== null && booking.basePrice !== null && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-sm">
          <span className="text-slate-500">
            {formatMoney(booking.basePrice, booking.currency)} × {nights} לילות
          </span>
          <span className="font-semibold text-slate-900">{formatMoney(total, booking.currency)}</span>
        </div>
      )}
    </div>
  )
}
