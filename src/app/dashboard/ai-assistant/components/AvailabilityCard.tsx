import { CalendarCheck, CalendarX2 } from 'lucide-react'
import type { CheckAvailabilitySuccess } from '@/lib/ai-assistant/tools/checkAvailability'
import { formatNightCount, formatNightSpan, formatPriceRange, formatShortDate } from '@/lib/ai-assistant/ui/format'
import { shiftDate } from '@/lib/ai-assistant/dates'

export default function AvailabilityCard({ result }: { result: CheckAvailabilitySuccess }) {
  const lastNight = shiftDate(result.checkOut, -1)

  return (
    <div className="card border-0 shadow-sm w-100" style={{ maxWidth: 520, background: 'var(--hsurf)' }} data-testid="ai-assistant-availability">
      <div className="card-body p-3">
        <div className="small mb-2" style={{ color: 'var(--htxt-3)' }}>
          {formatNightSpan(result.checkIn, lastNight)} · {formatNightCount(result.nights)}
        </div>
        <ul className="list-unstyled mb-0 d-flex flex-column gap-2">
          {result.rooms.map((room) => {
            const priceRange = formatPriceRange(Object.values(room.nightlyPrices))
            return (
              <li key={room.roomId} className="d-flex flex-column gap-1">
                <div className="d-flex align-items-center gap-2 fw-semibold" style={{ color: 'var(--htxt-1)' }}>
                  {room.fullyAvailable ? (
                    <CalendarCheck size={16} style={{ color: 'var(--bs-success)' }} />
                  ) : (
                    <CalendarX2 size={16} style={{ color: 'var(--bs-danger)' }} />
                  )}
                  {room.roomName}
                  <span className="fw-normal small" style={{ color: 'var(--htxt-2)' }}>
                    {room.fullyAvailable ? 'פנוי בכל הלילות' : `${formatNightCount(room.unavailableNights.length)} תפוסים`}
                  </span>
                </div>
                {!room.fullyAvailable && room.availableStays.length > 0 && (
                  <div className="small" style={{ color: 'var(--htxt-2)' }}>
                    פנוי: {room.availableStays.map((stay) => formatNightSpan(stay.checkIn, shiftDate(stay.checkOut, -1))).join(', ')}
                  </div>
                )}
                {!room.fullyAvailable && room.unavailableNights.length > 0 && room.unavailableNights.length <= 7 && (
                  <div className="small" style={{ color: 'var(--htxt-3)' }}>
                    תפוס: {room.unavailableNights.map(formatShortDate).join(', ')}
                  </div>
                )}
                {priceRange && (
                  <div className="small" style={{ color: 'var(--htxt-2)' }}>
                    מחיר ללילה: {priceRange}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
