'use client'

import { useState } from 'react'
import { format, startOfMonth } from 'date-fns'
import type { SiteContact } from '@/lib/landingBuilder/contact'
import { countNights, EMPTY_RANGE, selectStayDate, type StayRange } from '@/lib/landingBuilder/dateRange'
import { formatMoney } from '@/lib/landingBuilder/pricing'
import type { LandingDraft } from '@/lib/landingBuilder/types'
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

function PriceHeading({ booking, theme }: Pick<BookingWidgetProps, 'booking' | 'theme'>) {
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

/** Real availability is not wired yet (phase 7), so only past nights are blocked and the host confirms. */
const isNeverBooked = () => false

export function BookingWidget({ booking, contact, siteTitle, theme }: BookingWidgetProps) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [range, setRange] = useState<StayRange>(EMPTY_RANGE)

  const isBlocked = (iso: string) => iso < today

  return (
    <div className={`p-6 ${theme.card}`}>
      <PriceHeading booking={booking} theme={theme} />
      <div className="space-y-3.5">
        <BookingCalendar
          month={month}
          today={today}
          range={range}
          theme={theme}
          isBooked={isNeverBooked}
          onMonthChange={setMonth}
          onSelectDay={(iso) => setRange((current) => selectStayDate(current, iso, isBlocked))}
        />
        <BookingSummary range={range} booking={booking} />
        <InquiryActions
          contact={contact}
          theme={theme}
          details={{ siteTitle, checkIn: range.checkIn, checkOut: range.checkOut, nights: countNights(range) }}
        />
      </div>
    </div>
  )
}
