import React, { useMemo, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Reservation, RoomPrice } from '@/lib/dashboard/types'
import { formatCurrency } from '@/lib/dashboard/utils'
import { useHolidays } from '@/hooks/useHolidays'
import HolidayIndicator from '@/components/HolidayIndicator'
import { useSelectedRoom } from '@/lib/rooms/RoomContext'
import { toast } from 'sonner'
import { normalizeDate, toKey, isSameDay, addDays, buildDateRanges } from '@/lib/dashboard/calendarDates'

type CalendarPricingProps = {
  reservations: Reservation[]
  prices: RoomPrice[]
  onPricesUpdated?: () => Promise<void> | void
}

const DEFAULT_PRICE = undefined

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)

const addMonths = (date: Date, months: number) => {
  const copy = new Date(date)
  copy.setDate(1)
  copy.setMonth(copy.getMonth() + months)
  return copy
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

const HEBREW_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

const CalendarPricing = ({ reservations, prices, onPricesUpdated }: CalendarPricingProps) => {
  const { selectedRoomId } = useSelectedRoom()
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null)
  const monthBtnRef = useRef<HTMLButtonElement>(null)
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({})
  const [priceInput, setPriceInput] = useState('')
  const [minStayInput, setMinStayInput] = useState(1)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // Optimistic local-only availability overrides (dates blocked by the user in this session)
  const [manuallyBlockedDates, setManuallyBlockedDates] = useState<Set<string>>(new Set())

  // Reset local overrides and selection whenever the user switches to a different room
  const prevRoomRef = useRef<string | null>(null)
  useEffect(() => {
    if (prevRoomRef.current !== null && prevRoomRef.current !== selectedRoomId) {
      setPriceOverrides({})
      setManuallyBlockedDates(new Set())
      setSelectedDates([])
      setSaveError(null)
      setSaveSuccess(null)
      lastSelectedRef.current = null
    }
    prevRoomRef.current = selectedRoomId
  }, [selectedRoomId])
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const reservationDetailsRef = useRef<HTMLDivElement>(null)
  const lastSelectedRef = useRef<Date | null>(null)
  const todayKey = toKey(normalizeDate(new Date()))
  const [isMobile, setIsMobile] = useState(false)
  
  // Load Hebrew holidays for the current month
  const { holidays } = useHolidays(currentMonth)
  
  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  // Auto-scroll to reservation details when a reservation is selected
  useEffect(() => {
    if (selectedReservation && reservationDetailsRef.current) {
      reservationDetailsRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest'
      })
    }
  }, [selectedReservation])

  const bookingMap = useMemo(() => buildBookingMap(reservations), [reservations])
  const priceMap = useMemo(() => {
    const map: Record<string, number> = {}
    prices.forEach((entry) => {
      // price: 0 is a sentinel for "blocked with no explicit price" — skip it in the price map
      if (!entry?.date || typeof entry.price !== 'number' || entry.price === 0) {
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

  const availabilityMap = useMemo(() => {
    const map: Record<string, number> = {}
    prices.forEach((entry) => {
      if (!entry?.date) {
        return
      }
      // numAvail: 0 = blocked, >0 = available
      map[entry.date] = entry.numAvail ?? 1
    })
    // Overlay optimistic manual blocks so UI reflects changes before re-fetch
    manuallyBlockedDates.forEach((date) => {
      map[date] = 0
    })
    return map
  }, [prices, manuallyBlockedDates])

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

  const handleDateToggle = (date: Date, shiftKey = false) => {
    const key = toKey(date)
    const numAvail = availabilityMap[key] ?? 1
    
    // Check if date has a reservation
    if (bookingMap.has(key)) {
      const list = bookingMap.get(key)
      setSelectedReservation(list?.[0] ?? null)
      return
    }
    
    setSelectedReservation(null)

    // SHIFT+click: select range from last anchor to this date (includes blocked dates)
    if (shiftKey && lastSelectedRef.current) {
      const anchor = lastSelectedRef.current
      const rangeStart = anchor.getTime() <= date.getTime() ? anchor : date
      const rangeEnd = anchor.getTime() <= date.getTime() ? date : anchor
      const range: Date[] = []
      let cursor = new Date(rangeStart)
      while (cursor.getTime() <= rangeEnd.getTime()) {
        const cursorKey = toKey(cursor)
        if (!bookingMap.has(cursorKey)) {
          range.push(new Date(cursor))
        }
        cursor = addDays(cursor, 1)
      }
      setSelectedDates((prev) => {
        const merged = [...prev]
        range.forEach((d) => {
          if (!merged.some((m) => isSameDay(m, d))) merged.push(d)
        })
        return merged
      })
      return
    }

    // Regular click: toggle single date and update anchor
    lastSelectedRef.current = date
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
    // Prefer selectedRoomId from context (always accurate), fallback to prices data
    const resolvedRoomId =
      selectedRoomId ||
      prices.find((entry) => entry.roomId)?.roomId ||
      null

    const payload = [
      {
        ...(resolvedRoomId ? { roomId: Number(resolvedRoomId) } : {}),
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
      // Unblock dates that were manually blocked when a price is applied (opening them)
      setManuallyBlockedDates((prev) => {
        const next = new Set(prev)
        selectedDates.forEach((d) => next.delete(toKey(d)))
        return next
      })
      setSelectedDates([])
      lastSelectedRef.current = null
      if (onPricesUpdated) {
        await onPricesUpdated()
      }
      // Refresh availability cache in background so the embed also sees new prices
      if (resolvedRoomId) {
        fetch('/api/dashboard/cache/refresh', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ roomId: String(resolvedRoomId) }),
        }).catch(() => {})
      }
      setSaveSuccess('המחיר עודכן בהצלחה.')
      toast.success(`המחיר עודכן ל-₪${Number(priceInput).toLocaleString('he-IL')} בהצלחה`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'עדכון המחיר נכשל'
      setSaveError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const blockDates = async () => {
    if (!selectedDates.length || saving) return
    setSaveError(null)
    setSaveSuccess(null)
    setSaving(true)

    const resolvedRoomId =
      selectedRoomId ||
      prices.find((entry) => entry.roomId)?.roomId ||
      null

    // Send one entry per date so each can carry its current price1.
    // Beds24 only returns calendar records in GET when a price override exists;
    // including price1 ensures the blocked entry appears in future GET calls.
    const calendarEntries = selectedDates.map((date) => {
      const key = toKey(date)
      const currentPrice = priceOverrides[key] ?? priceMap[key]
      return {
        from: key,
        to: key,
        numAvail: 0,
        ...(currentPrice !== undefined && currentPrice > 0 ? { price1: currentPrice } : {}),
      }
    })

    const payload = [
      {
        ...(resolvedRoomId ? { roomId: Number(resolvedRoomId) } : {}),
        calendar: calendarEntries,
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
        throw new Error(details || 'סגירת התאריכים נכשלה')
      }

      // Optimistic update — block dates in local state immediately for instant feedback
      const blockedKeys = selectedDates.map(toKey)
      setManuallyBlockedDates((prev) => {
        const next = new Set(prev)
        blockedKeys.forEach((k) => next.add(k))
        return next
      })

      setSelectedDates([])
      lastSelectedRef.current = null
      if (onPricesUpdated) {
        await onPricesUpdated()
      }
      if (resolvedRoomId) {
        fetch('/api/dashboard/cache/refresh', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ roomId: String(resolvedRoomId) }),
        }).catch(() => {})
      }
      setSaveSuccess('התאריכים נסגרו להזמנות.')
      toast.success('התאריכים נסגרו להזמנות')
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'סגירת התאריכים נכשלה'
      setSaveError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const unblockDates = async () => {
    if (!selectedBlockedDates.length || saving) return
    setSaveError(null)
    setSaveSuccess(null)
    setSaving(true)

    const resolvedRoomId =
      selectedRoomId ||
      prices.find((entry) => entry.roomId)?.roomId ||
      null

    // Send numAvail: 1 per date, preserving current price so the calendar record stays in Beds24
    const calendarEntries = selectedBlockedDates.map((date) => {
      const key = toKey(date)
      const currentPrice = priceOverrides[key] ?? priceMap[key]
      return {
        from: key,
        to: key,
        numAvail: 1,
        ...(currentPrice !== undefined && currentPrice > 0 ? { price1: currentPrice } : {}),
      }
    })

    const payload = [
      {
        ...(resolvedRoomId ? { roomId: Number(resolvedRoomId) } : {}),
        calendar: calendarEntries,
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
        throw new Error(details || 'שחרור החסימה נכשל')
      }

      // Remove from optimistic local blocks
      setManuallyBlockedDates((prev) => {
        const next = new Set(prev)
        selectedBlockedDates.forEach((d) => next.delete(toKey(d)))
        return next
      })

      setSelectedDates([])
      lastSelectedRef.current = null
      if (onPricesUpdated) {
        await onPricesUpdated()
      }
      if (resolvedRoomId) {
        fetch('/api/dashboard/cache/refresh', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ roomId: String(resolvedRoomId) }),
        }).catch(() => {})
      }
      setSaveSuccess('החסימה שוחררה בהצלחה.')
      toast.success('החסימה שוחררה בהצלחה')
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'שחרור החסימה נכשל'
      setSaveError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const clearSelection = () => {
    setSelectedDates([])
    lastSelectedRef.current = null
  }

  // Derived selection state for sidebar logic
  const selectedHasBooked = selectedDates.some((d) => bookingMap.has(toKey(d)))
  const selectedBlockedDates = selectedDates.filter((d) => (availabilityMap[toKey(d)] ?? 1) === 0)
  const selectedFreeDates = selectedDates.filter((d) => (availabilityMap[toKey(d)] ?? 1) !== 0)
  const allSelectedAreBlocked = selectedDates.length > 0 && selectedBlockedDates.length === selectedDates.length

  const monthLabel = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(currentMonth)
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear())

  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <div className="d-flex align-items-center justify-content-between mb-3">
          {/* Month label — click to open picker */}
          <div style={{ position: 'relative' }}>
            <button
              ref={monthBtnRef}
              type="button"
              onClick={() => {
                if (showMonthPicker) {
                  setShowMonthPicker(false)
                  setPickerPos(null)
                } else {
                  const rect = monthBtnRef.current?.getBoundingClientRect()
                  if (rect) {
                    const dropdownWidth = 248
                    const spaceOnRight = window.innerWidth - rect.left
                    const left = spaceOnRight >= dropdownWidth
                      ? rect.left + window.scrollX
                      : Math.max(8, rect.right - dropdownWidth) + window.scrollX
                    setPickerPos({ top: rect.bottom + window.scrollY + 6, left })
                    setPickerYear(currentMonth.getFullYear())
                  }
                  setShowMonthPicker(true)
                }
              }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6,
                color: 'rgba(249, 147, 251, 0.9)', fontSize: '1.1rem', fontWeight: 600,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(102,126,234,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {monthLabel}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showMonthPicker && pickerPos && typeof document !== 'undefined' && createPortal(
              <>
                {/* Backdrop */}
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
                  onClick={() => { setShowMonthPicker(false); setPickerPos(null) }}
                />
                {/* Picker — absolute via portal so it scrolls with page */}
                <div style={{
                  position: 'absolute',
                  top: pickerPos.top,
                  left: pickerPos.left,
                  zIndex: 9999,
                  background: 'linear-gradient(135deg, #1e293b 0%, #2d3748 100%)',
                  borderRadius: 12,
                  padding: 14,
                  width: 248,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  border: '1px solid rgba(102,126,234,0.3)',
                }}>
                  {/* Year row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'rgba(249,147,251,0.9)', paddingRight: 4 }}>{pickerYear}</span>
                    <button type="button" onClick={() => setPickerYear(y => y + 1)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: '2px 8px', borderRadius: 6, fontSize: 16, lineHeight: 1 }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                    >›</button>
                  </div>
                  {/* Month grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                    {HEBREW_MONTHS.map((name, idx) => {
                      const isActive = currentMonth.getMonth() === idx && currentMonth.getFullYear() === pickerYear
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setCurrentMonth(startOfMonth(new Date(pickerYear, idx, 1)))
                            setShowMonthPicker(false)
                            setPickerPos(null)
                          }}
                          style={{
                            padding: '7px 4px', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                            fontWeight: isActive ? 700 : 400,
                            background: isActive ? 'linear-gradient(135deg,#667eea,#764ba2)' : 'rgba(255,255,255,0.06)',
                            color: isActive ? 'white' : 'rgba(255,255,255,0.75)',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(102,126,234,0.25)' }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                        >
                          {name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>,
              document.body
            )}
          </div>
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
        <div className="mb-2" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textAlign: 'right', direction: 'rtl' }}>
          לחץ על תאריך לבחירה · <kbd style={{ background: 'rgba(102,126,234,0.2)', border: '1px solid rgba(102,126,234,0.4)', borderRadius: '3px', padding: '0 4px', color: 'rgba(255,255,255,0.6)', fontSize: '10px' }}>Shift</kbd> + לחיצה לבחירת טווח
        </div>
        <div
          className="rounded-4"
          style={{
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x',
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
            border: '1px solid rgba(102, 126, 234, 0.2)',
          }}
        >
          <div style={{ minWidth: '520px', paddingBottom: '6px' }}>
            <div className="d-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', direction: 'rtl' }}>
              {['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'].map((day) => (
                <div key={day} className="text-center py-2 small fw-semibold" style={{ borderBottom: '1px solid rgba(102, 126, 234, 0.2)', color: 'rgba(249, 147, 251, 0.8)' }}>
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
                const numAvail = availabilityMap[key] ?? 1
                const isBlocked = numAvail === 0 && !isBooked
                const isSelected = selectedDates.some((item) => isSameDay(item, date))
                const isBlockedSelected = isBlocked && isSelected
                const price = priceOverrides[key] ?? priceMap[key] ?? DEFAULT_PRICE
                const hasPrice = price !== undefined
                const isToday = key === todayKey
                const showTodayHighlight = isToday && !isSelected && !isBlocked
                const isBookingStart = isBooked && !isBookedOn(bookingMap, addDays(date, -1))
                const isBookingEnd = isBooked && !isBookedOn(bookingMap, addDays(date, 1))
                const bookingRadius = isBooked
                  ? `${isBookingStart ? '12px' : '0'} ${isBookingEnd ? '12px' : '0'} ${isBookingEnd ? '12px' : '0'} ${
                      isBookingStart ? '12px' : '0'
                    }`
                  : '12px'

                const holiday = holidays.get(key)
                
                return (
                  <button
                    key={key}
                    type="button"
                    className="text-start p-2"
                    data-testid="calendar-day"
                    data-date={key}
                    style={{
                      position: 'relative',
                      minHeight: '90px',
                      background: isBlockedSelected
                        ? 'repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.2) 10px, rgba(239, 68, 68, 0.3) 10px, rgba(239, 68, 68, 0.3) 20px)'
                        : isBlocked
                        ? 'repeating-linear-gradient(45deg, rgba(255, 152, 0, 0.1), rgba(255, 152, 0, 0.1) 10px, rgba(255, 152, 0, 0.15) 10px, rgba(255, 152, 0, 0.15) 20px)'
                        : isSelected 
                        ? 'rgba(102, 126, 234, 0.3)' 
                        : showTodayHighlight 
                        ? 'rgba(102, 126, 234, 0.15)' 
                        : 'transparent',
                      color: 'rgba(255, 255, 255, 0.9)',
                      opacity: isCurrentMonth ? (isBlocked && !isBlockedSelected ? 0.6 : 1) : 0.4,
                      cursor: isBooked ? 'not-allowed' : 'pointer',
                      border: isToday ? '2px solid rgba(102, 126, 234, 0.6)' : isBlockedSelected ? '1px solid rgba(239, 68, 68, 0.6)' : isBlocked ? '1px solid rgba(255, 152, 0, 0.3)' : '1px solid rgba(102, 126, 234, 0.25)',
                      borderRadius: '0',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isBooked) {
                        if (isBlocked) {
                          e.currentTarget.style.opacity = '1'
                        } else {
                          e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)'
                        }
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isBooked) {
                        if (isBlocked) {
                          e.currentTarget.style.opacity = isCurrentMonth ? '1' : '0.4'
                        } else {
                          e.currentTarget.style.background = isSelected 
                            ? 'rgba(102, 126, 234, 0.3)' 
                            : showTodayHighlight 
                            ? 'rgba(102, 126, 234, 0.15)' 
                            : 'transparent'
                        }
                      }
                    }}
                    onClick={(e) => handleDateToggle(date, e.shiftKey)}
                  >
                    {holiday && <HolidayIndicator holiday={holiday} isMobile={isMobile} />}
                    <span
                      className="fw-semibold"
                      style={{ position: 'absolute', top: '8px', left: '8px', fontSize: '14px', color: isBlocked ? 'rgba(255, 152, 0, 0.9)' : 'rgba(255, 255, 255, 0.9)' }}
                    >
                      {date.getDate()}
                    </span>
                    {isToday ? (
                      <span
                        className="badge"
                        style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(102, 126, 234, 0.8)', color: 'white' }}
                      >
                        היום
                      </span>
                    ) : null}
                    {isBlocked ? (
                      <span
                        className="badge"
                        style={{ position: 'absolute', top: '8px', right: '8px', background: isBlockedSelected ? 'rgba(239, 68, 68, 0.9)' : 'rgba(255, 152, 0, 0.8)', color: 'white', fontSize: '10px' }}
                      >
                        {isBlockedSelected ? 'לפתיחה' : 'חסום'}
                      </span>
                    ) : null}
                    <div className="small mt-1" style={{ color: isBlockedSelected ? 'rgba(239, 68, 68, 0.9)' : isBlocked ? 'rgba(255, 152, 0, 0.7)' : hasPrice ? 'rgba(249, 147, 251, 0.8)' : 'rgba(255,255,255,0.25)' }}>
                      {isBlocked ? 'חסום' : hasPrice ? formatCurrency(price) : '—'}
                    </div>
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
                      background: 'rgba(239, 68, 68, 0.3)',
                      border: '1px solid rgba(239, 68, 68, 0.5)',
                      borderRadius: '999px',
                      padding: '0 10px',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '12px',
                      color: 'rgba(255, 200, 200, 0.95)',
                      fontWeight: '600',
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
        <div className="card border-0 h-100" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
          <div className="card-body">
            <h3 className="h6 fw-bold mb-3" style={{ color: 'rgba(249, 147, 251, 0.9)' }}>שינוי מחיר לפי תאריך</h3>
            <div className="small mb-3" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              בחר תאריכים בלוח משמאל — עדכן מחיר או סגור להזמנות. לחץ על תאריך חסום כדי לסמן אותו לפתיחה.
            </div>
            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label small fw-semibold" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                  מחיר ללילה (₪) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  className="form-control"
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(102, 126, 234, 0.3)',
                    color: 'white',
                  }}
                  value={priceInput}
                  onChange={(event) => setPriceInput(event.target.value)}
                  required
                />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>מינימום לילות</label>
                <input
                  type="number"
                  min={1}
                  className="form-control"
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(102, 126, 234, 0.3)',
                    color: 'white',
                  }}
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
              {saving ? 'שומר...' : allSelectedAreBlocked ? 'עדכן מחיר ופתח תאריכים' : 'עדכן מחיר לתאריכים שנבחרו'}
            </button>
            <button
              type="button"
              className="btn w-100 mt-2"
              style={{
                background: selectedDates.length && !selectedHasBooked && selectedFreeDates.length > 0
                  ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                  : 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: 'white',
              }}
              onClick={blockDates}
              disabled={!selectedFreeDates.length || selectedHasBooked || saving}
              title={selectedHasBooked ? 'לא ניתן לסגור תאריכים עם הזמנות קיימות' : 'סגור תאריכים חופשיים נבחרים להזמנות'}
            >
              {saving ? 'שומר...' : 'סגור להזמנות'}
            </button>
            <button
              type="button"
              className="btn w-100 mt-2"
              style={{
                background: selectedBlockedDates.length > 0
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: 'white',
              }}
              onClick={unblockDates}
              disabled={!selectedBlockedDates.length || saving}
              title="שחרר חסימה לתאריכים חסומים שנבחרו"
            >
              {saving ? 'שומר...' : 'שחרר חסימה'}
            </button>
            <div className="mt-4">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="small fw-semibold" style={{ color: 'rgba(249, 147, 251, 0.9)' }}>תאריכים שנבחרו</div>
                {selectedDates.length ? (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{
                      border: '1px solid rgba(102, 126, 234, 0.5)',
                      color: 'rgba(255, 255, 255, 0.8)',
                      backgroundColor: 'rgba(102, 126, 234, 0.2)',
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
                    <span key={toKey(date)} className="badge" style={{ background: 'rgba(102, 126, 234, 0.6)', color: 'white' }}>
                      {new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: 'short' }).format(date)}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="small" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>לא נבחרו תאריכים.</div>
              )}
            </div>
            <div className="mt-4">
              <div className="small fw-semibold mb-2" style={{ color: 'rgba(249, 147, 251, 0.9)' }}>מקרא</div>
              <div className="d-flex flex-column gap-2 small" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                <div>
                  <span className="badge me-2" style={{ background: 'rgba(239, 68, 68, 0.6)' }}>תפוס</span>
                  תאריך עם הזמנה קיימת
                </div>
                <div>
                  <span className="badge me-2" style={{ background: 'rgba(255, 152, 0, 0.6)' }}>חסום</span>
                  תאריך חסום ב-Beds24
                </div>
                <div>
                  <span className="badge me-2" style={{ background: 'rgba(239, 68, 68, 0.9)' }}>לפתיחה</span>
                  תאריך חסום שנבחר לפתיחה
                </div>
                <div>
                  <span className="badge me-2" style={{ background: 'rgba(102, 126, 234, 0.6)' }}>נבחר</span>
                  תאריך פנוי שנבחר לעדכון / סגירה
                </div>
                <div>
                  <span 
                    style={{ 
                      display: 'inline-block',
                      fontSize: '14px',
                      marginLeft: '8px',
                      marginRight: '8px'
                    }}
                  >
                    🚩
                  </span>
                  חג יהודי
                </div>
                <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <small className="text-muted">
                    💡 ניתן להזמין checkout/checkin באותו יום
                  </small>
                </div>
              </div>
            </div>
            <div className="mt-4" ref={reservationDetailsRef}>
              <div className="small fw-semibold mb-2" style={{ color: 'rgba(249, 147, 251, 0.9)' }}>פרטי הזמנה</div>
              {selectedReservation ? (
                <div className="rounded-3 p-3" style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(102, 126, 234, 0.3)' }}>
                  <div className="fw-semibold" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{selectedReservation.guestName}</div>
                  <div className="small" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    {selectedReservation.checkIn} - {selectedReservation.checkOut}
                  </div>
                  <div className="small mt-2" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    <span className="fw-semibold">סטטוס:</span> {selectedReservation.status}
                  </div>
                  <div className="small" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    <span className="fw-semibold">לילות:</span> {selectedReservation.nights}
                  </div>
                  <div className="small" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    <span className="fw-semibold">סה״כ:</span> {formatCurrency(selectedReservation.total)}
                  </div>
                  {selectedReservation.source ? (
                    <div className="small" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                      <span className="fw-semibold">מקור:</span> {selectedReservation.source}
                    </div>
                  ) : null}
                  {selectedReservation.unitName ? (
                    <div className="small" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                      <span className="fw-semibold">יחידה:</span> {selectedReservation.unitName}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="small" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>בחר תאריך עם הזמנה כדי לראות פרטים.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CalendarPricing
