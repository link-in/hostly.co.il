'use client'

import { useState } from 'react'
import { format, startOfMonth } from 'date-fns'
import { isNightUnavailable, lowestAvailablePrice, quoteStay } from '@/lib/landingBuilder/availability/nightlyRates'
import type { SiteContact } from '@/lib/landingBuilder/contact'
import { EMPTY_RANGE, selectStayDate, type StayRange } from '@/lib/landingBuilder/dateRange'
import { formatMoney } from '@/lib/landingBuilder/pricing'
import type { LandingDraft } from '@/lib/landingBuilder/types'
import { useNightlyRates } from './availabilitySource'
import { BookingCalendar } from './BookingCalendar'
import { BookingSummary } from './BookingSummary'
import type { BookingTheme } from './bookingTheme'
import { InquiryActions } from './InquiryActions'

interface BookingWidgetProps {
  booking: LandingDraft['booking']
  contact: SiteContact
  siteTitle: string
  theme: BookingTheme
}

function PriceHeading({ price, isFrom, currency, theme }: { price: number | null; isFrom: boolean; currency: string; theme: BookingTheme }) {
  return (
    <div className="mb-3.5">
      {price !== null ? (
        <p className={`text-2xl ${theme.heading}`}>
          {isFrom && <span className="text-sm font-normal text-slate-400">החל מ-</span>}
          {formatMoney(price, currency)}
          <span className="text-sm font-normal text-slate-400"> / לילה</span>
        </p>
      ) : (
        <p className={`text-lg ${theme.heading}`}>בדיקת זמינות</p>
      )}
      <p className="mt-0.5 text-xs text-emerald-600">הזמנה ישירה — המחיר הטוב ביותר, בלי עמלות</p>
    </div>
  )
}

export function BookingWidget({ booking, contact, siteTitle, theme }: BookingWidgetProps) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [range, setRange] = useState<StayRange>(EMPTY_RANGE)
  const { rates, isLoading } = useNightlyRates()

  const isBooked = (iso: string) => isNightUnavailable(rates, iso)
  const isBlocked = (iso: string) => iso < today || isBooked(iso)
  const quote = quoteStay(rates, range)
  const lowest = lowestAvailablePrice(rates)
  const hasStay = range.checkIn !== null && range.checkOut !== null && quote.meetsMinStay

  return (
    <div className={`p-6 ${theme.card}`}>
      <PriceHeading price={lowest ?? booking.basePrice} isFrom={lowest !== null} currency={booking.currency} theme={theme} />
      <div className="space-y-3.5">
        <BookingCalendar
          month={month}
          today={today}
          range={range}
          theme={theme}
          isBooked={isBooked}
          onMonthChange={setMonth}
          onSelectDay={(iso) => !isLoading && setRange((current) => selectStayDate(current, iso, isBlocked))}
        />
        {isLoading && <p className="text-center text-xs text-slate-400">טוענים זמינות…</p>}
        <BookingSummary range={range} quote={quote} currency={booking.currency} />
        <InquiryActions
          contact={contact}
          theme={theme}
          details={{
            siteTitle,
            checkIn: hasStay ? range.checkIn : null,
            checkOut: hasStay ? range.checkOut : null,
            nights: quote.nights,
            total: quote.total === null ? null : formatMoney(quote.total, booking.currency),
          }}
        />
      </div>
    </div>
  )
}
