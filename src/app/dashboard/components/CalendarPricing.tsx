import React, { useMemo, useState } from 'react'
import type { Reservation, RoomPrice } from '@/lib/dashboard/types'
import { formatCurrency } from '@/lib/dashboard/utils'

type CalendarPricingProps = {
  reservations: Reservation[]
  prices: RoomPrice[]
  onPricesUpdated?: () => Promise<void> | void
}

const DEFAULT_PRICE = 650

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)

const normalizeDate = (value: Date) => {
  const normalized = new Date(value)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

const toKey = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isSameDay = (a: Date, b: Date) => a.getTime() === b.getTime()

const addDays = (date: Date, days: number) => {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

const addMonths = (date: Date, months: number) => {
  const copy = new Date(date)
  copy.setDate(1)
  copy.setMonth(copy.getMonth() + months)
  return copy
}

const sortDates = (dates: Date[]) => {
  return [...dates].sort((a, b) => a.getTime() - b.getTime())
}

const buildDateRanges = (dates: Date[]) => {
  const sorted = sortDates(dates)
  if (!sorted.length) {
    return []
  }

  const ranges: { from: string; to: string }[] = []
  let rangeStart = sorted[0]
  let prev = sorted[0]

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i]
    const expected = addDays(prev, 1)
    if (isSameDay(current, expected)) {
      prev = current
      continue
    }

    ranges.push({ from: toKey(rangeStart), to: toKey(prev) })
    rangeStart = current
    prev = current
  }

  ranges.push({ from: toKey(rangeStart), to: toKey(prev) })
  return ranges
}

const buildBookingMap = (reservations: Reservation[]) => {
  const booked = new Map<string, Reservation[]>()

  reservations.forEach((reservation) => {
    if (!reservation.checkIn || !reservation.checkOut) {
      return
    }

    const checkIn = normalizeDate(new Date(reservation.checkIn))
    const checkOut = normalizeDate(new Date(reservation.checkOut))

    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      return
    }

    let cursor = checkIn
    while (cursor < checkOut) {
      const key = toKey(cursor)
      const list = booked.get(key) ?? []
      list.push(reservation)
      booked.set(key, list)
      cursor = addDays(cursor, 1)
    }
  })

  return booked
}

const isBookedOn = (bookingMap: Map<string, Reservation[]>, date: Date) => {
  const key = toKey(date)
  return bookingMap.has(key)
}

type BookingSegment = {
  id: string
  row: number
  startCol: number
  endCol: number
  label: string
}

const buildBookingSegments = (reservations: Reservation[], days: Date[]) => {
  const indexMap = new Map<string, number>()
  days.forEach((date, index) => {
    indexMap.set(toKey(date), index)
  })

  const segments = new Map<string, BookingSegment>()

  reservations.forEach((reservation) => {
    if (!reservation.checkIn || !reservation.checkOut) {
      return
    }

    const checkIn = normalizeDate(new Date(reservation.checkIn))
    const checkOut = normalizeDate(new Date(reservation.checkOut))
    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      return
    }

    let cursor = checkIn
    while (cursor < checkOut) {
      const key = toKey(cursor)
      const index = indexMap.get(key)
      if (index !== undefined) {
        const row = Math.floor(index / 7)
        const col = index % 7
        const segmentKey = `${reservation.id}-${row}`
        const existing = segments.get(segmentKey)
        if (existing) {
          existing.startCol = Math.min(existing.startCol, col)
          existing.endCol = Math.max(existing.endCol, col)
        } else {
          segments.set(segmentKey, {
            id: segmentKey,
            row,
            startCol: col,
            endCol: col,
            label: reservation.guestName,
          })
        }
      }
      cursor = addDays(cursor, 1)
    }
  })

  return Array.from(segments.values())
}

const CalendarPricing = ({ reservations, prices, onPricesUpdated }: CalendarPricingProps) => {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({})
  const [priceInput, setPriceInput] = useState('')
  const [minStayInput, setMinStayInput] = useState(1)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const todayKey = toKey(normalizeDate(new Date()))

  const bookingMap = useMemo(() => buildBookingMap(reservations), [reservations])
  const priceMap = useMemo(() => {
    const map: Record<string, number> = {}
    prices.forEach((entry) => {
      if (!entry?.date || typeof entry.price !== 'number') {
        return
      }
      const existing = map[entry.date]
      if (existing === undefined) {
        map[entry.date] = entry.price
      } else {
        map[entry.date] = Math.min(existing, entry.price)
      }
    })
    return map
  }, [prices])

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const leading = start.getDay()
    const totalCells = leading + end.getDate()
    const rows = Math.ceil(totalCells / 7) * 7

    const result: Date[] = []
    const firstCell = addDays(start, -leading)
    for (let i = 0; i < rows; i += 1) {
      result.push(addDays(firstCell, i))
    }
    return result
  }, [currentMonth])

  const bookingSegments = useMemo(() => buildBookingSegments(reservations, days), [reservations, days])
  const weeksCount = Math.ceil(days.length / 7)

  const handleDateToggle = (date: Date) => {
    const key = toKey(date)
    if (bookingMap.has(key)) {
      const list = bookingMap.get(key)
      setSelectedReservation(list?.[0] ?? null)
      return
    }
    setSelectedReservation(null)
    setSelectedDates((prev) => {
      const exists = prev.some((item) => isSameDay(item, date))
      if (exists) {
        return prev.filter((item) => !isSameDay(item, date))
      }
      return [...prev, date]
    })
  }

  const applyPrice = async () => {
    if (!selectedDates.length) {
      return
    }
    if (!priceInput.trim()) {
      setSaveError('יש להזין מחיר ללילה.')
      return
    }
    if (saving) {
      return
    }
    setSaveError(null)
    setSaveSuccess(null)
    setSaving(true)

    const ranges = buildDateRanges(selectedDates)
    const payload = [
      {
        ...(prices.find((entry) => entry.roomId)?.roomId ? { roomId: Number(prices.find((entry) => entry.roomId)?.roomId) } : {}),
        calendar: ranges.map((range) => ({
          from: range.from,
          to: range.to,
          minStay: minStayInput,
          price1: Number(priceInput),
          numAvail: 1,
        })),
      },
    ]

    try {
      const response = await fetch('/api/dashboard/rooms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const details = await response.text()
        throw new Error(details || 'Failed to update prices')
      }
      const result = await response.json()
      if (result && typeof result === 'object' && (result as { success?: boolean; error?: string }).success === false) {
        throw new Error((result as { error?: string }).error ?? 'עדכון המחיר נכשל')
      }

      setPriceOverrides((prev) => {
        const next = { ...prev }
        selectedDates.forEach((date) => {
          next[toKey(date)] = Number(priceInput)
        })
        return next
      })
      setSelectedDates([])
      if (onPricesUpdated) {
        await onPricesUpdated()
      }
      setSaveSuccess('המחיר עודכן בהצלחה.')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'עדכון המחיר נכשל')
    } finally {
      setSaving(false)
    }
  }

  const clearSelection = () => {
    setSelectedDates([])
  }

  const monthLabel = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(currentMonth)

  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="fw-semibold">{monthLabel}</div>
          <div className="d-flex align-items-center gap-1">
            <button
              type="button"
              className="btn btn-sm d-flex align-items-center justify-content-center"
              style={{
                width: '32px',
                height: '32px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#667eea',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
              onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
              title="חודש קודם"
              aria-label="חודש קודם"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <button
              type="button"
              className="btn btn-sm d-flex align-items-center justify-content-center"
              style={{
                width: '32px',
                height: '32px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#667eea',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              title="חודש הבא"
              aria-label="חודש הבא"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>
        </div>
        <div
          className="border rounded-4 bg-white"
          style={{
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x',
          }}
        >
          <div style={{ minWidth: '520px', paddingBottom: '6px' }}>
            <div className="d-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', direction: 'rtl' }}>
              {['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'].map((day) => (
                <div key={day} className="text-center py-2 border-bottom text-muted small fw-semibold">
                  {day}
                </div>
              ))}
            </div>
            <div className="position-relative">
              <div className="d-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '90px', direction: 'rtl' }}>
                {days.map((date) => {
                const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
                const key = toKey(date)
                const isBooked = bookingMap.has(key)
                const isSelected = selectedDates.some((item) => isSameDay(item, date))
                const price = priceOverrides[key] ?? priceMap[key] ?? DEFAULT_PRICE
                const isToday = key === todayKey
                const showTodayHighlight = isToday && !isSelected
                const isBookingStart = isBooked && !isBookedOn(bookingMap, addDays(date, -1))
                const isBookingEnd = isBooked && !isBookedOn(bookingMap, addDays(date, 1))
                const bookingRadius = isBooked
                  ? `${isBookingStart ? '12px' : '0'} ${isBookingEnd ? '12px' : '0'} ${isBookingEnd ? '12px' : '0'} ${
                      isBookingStart ? '12px' : '0'
                    }`
                  : '12px'

                return (
                  <button
                    key={key}
                    type="button"
                    className="border-0 text-start p-2"
                    style={{
                      position: 'relative',
                      minHeight: '90px',
                      background: isSelected ? 'rgba(13, 148, 136, 0.18)' : showTodayHighlight ? 'rgba(13, 148, 136, 0.12)' : 'transparent',
                      color: isSelected ? '#0f172a' : 'inherit',
                      opacity: isCurrentMonth ? 1 : 0.4,
                      cursor: isBooked ? 'not-allowed' : 'pointer',
                      border: isToday ? '2px solid #0d9488' : '1px solid transparent',
                      borderRadius: bookingRadius,
                    }}
                    onClick={() => handleDateToggle(date)}
                  >
                    <span
                      className="fw-semibold"
                      style={{ position: 'absolute', top: '8px', left: '8px', fontSize: '14px' }}
                    >
                      {date.getDate()}
                    </span>
                    {isToday ? (
                      <span
                        className="badge bg-success"
                        style={{ position: 'absolute', top: '8px', right: '8px' }}
                      >
                        היום
                      </span>
                    ) : null}
                    <div className="small text-muted mt-1">{formatCurrency(price)}</div>
                  </button>
                )
                })}
              </div>
              <div
                className="position-absolute top-0 start-0 w-100 h-100"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gridTemplateRows: `repeat(${weeksCount}, 1fr)`,
                  gap: '6px',
                  padding: '8px',
                  pointerEvents: 'none',
                  direction: 'rtl',
                }}
              >
                {bookingSegments.map((segment) => (
                  <div
                    key={segment.id}
                    style={{
                      gridColumn: `${segment.startCol + 1} / ${segment.endCol + 2}`,
                      gridRow: segment.row + 1,
                      alignSelf: 'center',
                      justifySelf: 'stretch',
                      height: '20px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      borderRadius: '999px',
                      padding: '0 10px',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '12px',
                      color: '#991b1b',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      marginTop: '52px',
                    }}
                  >
                    {segment.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="col-lg-4">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body">
            <h3 className="h6 fw-bold mb-3">שינוי מחיר לפי תאריך</h3>
            <div className="small text-muted mb-3">
              בחר תאריכים בלוח משמאל, ועדכן מחיר ללילה.
            </div>
            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label small fw-semibold">
                  מחיר ללילה (₪) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  className="form-control"
                  value={priceInput}
                  onChange={(event) => setPriceInput(event.target.value)}
                  required
                />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold">מינימום לילות</label>
                <input
                  type="number"
                  min={1}
                  className="form-control"
                  value={minStayInput}
                  onChange={(event) => setMinStayInput(Math.max(1, Number(event.target.value)))}
                />
              </div>
            </div>
            {saveError ? (
              <div className="alert alert-danger py-2 mb-3" role="alert">
                {saveError}
              </div>
            ) : null}
            {saveSuccess ? (
              <div className="alert alert-success py-2 mb-3" role="alert">
                {saveSuccess}
              </div>
            ) : null}
            <button
              type="button"
              className="btn w-100"
              style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                color: 'white',
              }}
              onClick={applyPrice}
              disabled={!selectedDates.length || !priceInput.trim() || saving}
            >
              {saving ? 'שומר מחיר...' : 'עדכן מחיר לתאריכים שנבחרו'}
            </button>
            <div className="mt-4">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="small fw-semibold">תאריכים שנבחרו</div>
                {selectedDates.length ? (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{
                      border: '1px solid #cbd5e1',
                      color: '#64748b',
                      backgroundColor: 'transparent',
                      fontSize: '0.7rem',
                      padding: '0.15rem 0.4rem',
                    }}
                    onClick={clearSelection}
                    title="איפוס בחירה"
                  >
                    איפוס
                  </button>
                ) : null}
              </div>
              {selectedDates.length ? (
                <div className="d-flex flex-wrap gap-2">
                  {selectedDates.map((date) => (
                    <span key={toKey(date)} className="badge bg-secondary">
                      {new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: 'short' }).format(date)}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="small text-muted">לא נבחרו תאריכים.</div>
              )}
            </div>
            <div className="mt-4">
              <div className="small fw-semibold mb-2">מקרא</div>
              <div className="d-flex flex-column gap-2 small">
                <div>
                  <span className="badge bg-danger me-2">תפוס</span>
                  תאריך עם הזמנה קיימת
                </div>
                <div>
                  <span className="badge bg-success me-2">נבחר</span>
                  תאריך שנבחר לעדכון מחיר
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="small fw-semibold mb-2">פרטי הזמנה</div>
              {selectedReservation ? (
                <div className="border rounded-3 p-3 bg-light">
                  <div className="fw-semibold">{selectedReservation.guestName}</div>
                  <div className="small text-muted">
                    {selectedReservation.checkIn} - {selectedReservation.checkOut}
                  </div>
                  <div className="small mt-2">
                    <span className="fw-semibold">סטטוס:</span> {selectedReservation.status}
                  </div>
                  <div className="small">
                    <span className="fw-semibold">לילות:</span> {selectedReservation.nights}
                  </div>
                  <div className="small">
                    <span className="fw-semibold">סה״כ:</span> {formatCurrency(selectedReservation.total)}
                  </div>
                  {selectedReservation.source ? (
                    <div className="small">
                      <span className="fw-semibold">מקור:</span> {selectedReservation.source}
                    </div>
                  ) : null}
                  {selectedReservation.unitName ? (
                    <div className="small">
                      <span className="fw-semibold">יחידה:</span> {selectedReservation.unitName}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="small text-muted">בחר תאריך עם הזמנה כדי לראות פרטים.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CalendarPricing
