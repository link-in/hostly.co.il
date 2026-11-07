import { addMonths, format, isBefore, parseISO, startOfMonth } from 'date-fns'
import { he } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { buildMonthGrid, type CalendarDay } from '@/lib/landingBuilder/calendarGrid'
import { isInRange, type StayRange } from '@/lib/landingBuilder/dateRange'
import type { BookingTheme } from './bookingTheme'

const WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

interface BookingCalendarProps {
  month: Date
  today: string
  range: StayRange
  theme: BookingTheme
  isBooked: (iso: string) => boolean
  /** Short nightly price for a day, or null to show the date alone. */
  priceLabel: (iso: string) => string | null
  onMonthChange: (month: Date) => void
  onSelectDay: (iso: string) => void
}

function dayClasses(day: CalendarDay, props: BookingCalendarProps): string {
  const { range, today, theme, isBooked } = props
  const isEndpoint = day.iso === range.checkIn || day.iso === range.checkOut

  if (day.iso < today) return 'cursor-default text-slate-300'
  if (isEndpoint) return `${theme.selectedDay} font-semibold`
  if (isInRange(range, day.iso)) return theme.rangeDay
  if (isBooked(day.iso)) return 'cursor-pointer text-slate-300 line-through'
  return 'cursor-pointer rounded-lg text-slate-700 hover:bg-slate-100'
}

function DayContent({ day, price }: { day: CalendarDay; price: string | null }) {
  return (
    <>
      <span className="leading-none">{day.dayOfMonth}</span>
      {price && (
        <span className="text-[10px] leading-none font-normal tabular-nums opacity-60" dir="ltr">
          {price}
        </span>
      )}
    </>
  )
}

export function BookingCalendar(props: BookingCalendarProps) {
  const { month, today, priceLabel, onMonthChange, onSelectDay } = props
  const canGoBack = isBefore(startOfMonth(parseISO(today)), startOfMonth(month))

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="החודש הקודם"
          disabled={!canGoBack}
          onClick={() => onMonthChange(addMonths(month, -1))}
          className="grid size-7 cursor-pointer place-items-center rounded-full text-slate-500 hover:bg-slate-100 disabled:cursor-default disabled:opacity-30"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
        <span className="text-sm font-semibold text-slate-800">{format(month, 'LLLL yyyy', { locale: he })}</span>
        <button
          type="button"
          aria-label="החודש הבא"
          onClick={() => onMonthChange(addMonths(month, 1))}
          className="grid size-7 cursor-pointer place-items-center rounded-full text-slate-500 hover:bg-slate-100"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-slate-400">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className="py-1">
            {weekday}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {buildMonthGrid(month).map((day) =>
          day.inMonth ? (
            <button
              key={day.iso}
              type="button"
              disabled={day.iso < today}
              onClick={() => onSelectDay(day.iso)}
              className={`flex aspect-square flex-col items-center justify-center gap-1 text-sm transition ${dayClasses(day, props)}`}
            >
              <DayContent day={day} price={day.iso < today ? null : priceLabel(day.iso)} />
            </button>
          ) : (
            <span key={day.iso} aria-hidden />
          ),
        )}
      </div>
    </div>
  )
}
