'use client'

import { useState } from 'react'
import { format, startOfMonth } from 'date-fns'
import { CreditCard } from 'lucide-react'
import { EMPTY_RANGE, selectStayDate, type StayRange } from '@/lib/landingBuilder/dateRange'
import { isMockBooked } from '@/lib/landingBuilder/mockAvailability'
import { formatMoney } from '@/lib/landingBuilder/pricing'
import type { LandingDraft } from '@/lib/landingBuilder/types'
import { BookingCalendar } from './BookingCalendar'
import { BookingSummary } from './BookingSummary'
import { CheckoutMock } from './CheckoutMock'
import type { BookingTheme } from './bookingTheme'

interface BookingWidgetProps {
  booking: LandingDraft['booking']
  theme: BookingTheme
}

function PriceHeading({ booking, theme }: BookingWidgetProps) {
  return (
    <div className="mb-3.5">
      {booking.basePrice !== null ? (
        <p className={`text-2xl ${theme.heading}`}>
          {formatMoney(booking.basePrice, booking.currency)}
          <span className="text-sm font-normal text-slate-400"> / לילה</span>
        </p>
      ) : (
        <p className={`text-lg ${theme.heading}`}>בדיקת זמינות</p>
      )}
      <p className="mt-0.5 text-xs text-emerald-600">הזמנה ישירה — המחיר הטוב ביותר, בלי עמלות</p>
    </div>
  )
}

export function BookingWidget({ booking, theme }: BookingWidgetProps) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [range, setRange] = useState<StayRange>(EMPTY_RANGE)
  const [stage, setStage] = useState<'dates' | 'checkout'>('dates')

  const isBlocked = (iso: string) => iso < today || isMockBooked(iso)
  const canCheckout = range.checkIn !== null && range.checkOut !== null

  return (
    <div className={`p-6 ${theme.card}`}>
      <PriceHeading booking={booking} theme={theme} />
      {stage === 'checkout' ? (
        <CheckoutMock theme={theme} onBack={() => setStage('dates')} />
      ) : (
        <div className="space-y-3.5">
          <BookingCalendar
            month={month}
            today={today}
            range={range}
            theme={theme}
            isBooked={isMockBooked}
            onMonthChange={setMonth}
            onSelectDay={(iso) => setRange((current) => selectStayDate(current, iso, isBlocked))}
          />
          <BookingSummary range={range} booking={booking} />
          <button
            type="button"
            disabled={!canCheckout}
            onClick={() => setStage('checkout')}
            className={`flex w-full cursor-pointer items-center justify-center gap-2 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${theme.primaryButton}`}
          >
            <CreditCard className="size-4" aria-hidden />
            {canCheckout ? 'להזמנה ותשלום' : 'בחרו תאריכים'}
          </button>
        </div>
      )}
    </div>
  )
}
