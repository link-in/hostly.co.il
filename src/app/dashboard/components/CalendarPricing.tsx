import React, { useMemo, useState, useRef, useEffect } from 'react'
import { Tag, Lock, Unlock, ExternalLink } from 'lucide-react'
import { createPortal } from 'react-dom'
import type { Reservation, ReservationStatus, RoomPrice } from '@/lib/dashboard/types'
import { formatCurrency, formatStatus } from '@/lib/dashboard/utils'
import { channelLinkLabel } from '@/lib/dashboard/channelLinks'
import { useHolidays } from '@/hooks/useHolidays'
import HolidayIndicator from '@/components/HolidayIndicator'
import { useSelectedRoom } from '@/lib/rooms/RoomContext'
import { toast } from 'sonner'
import { normalizeDate, toKey, isSameDay, addDays, buildDateRanges } from '@/lib/dashboard/calendarDates'
import { buildBookingMap, isBookedOn, buildBookingSegments } from '@/lib/dashboard/bookingSegments'

type CalendarPricingProps = {
  reservations: Reservation[]
  prices: RoomPrice[]
  onPricesUpdated?: () => Promise<void> | void
}

const DEFAULT_PRICE = undefined

function getSegmentBarStyle(status: ReservationStatus): React.CSSProperties {
  // Requests (pending channel) = amber — awaiting approval
  if (status === 'request') {
    return {
      background: 'rgba(245, 158, 11, 0.15)',
      border: '1.5px dashed rgba(217, 119, 6, 0.7)',
      color: '#92400E',
    }
  }
  // Confirmed/new/pending bookings = teal-green — positive, occupied
  return {
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.5)',
    color: '#065F46',
  }
}

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)

const addMonths = (date: Date, months: number) => {
  const copy = new Date(date)
  copy.setDate(1)
  copy.setMonth(copy.getMonth() + months)
  return copy
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
                borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6,
                color: '#2F3133', fontSize: '1.05rem', fontWeight: 600,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(113,51,217,0.07)')}
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
                  background: '#fff',
                  borderRadius: 8,
                  padding: 14,
                  width: 248,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  border: '1px solid #CED7E0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#2F3133', paddingRight: 4 }}>{pickerYear}</span>
                    <button type="button" onClick={() => setPickerYear(y => y + 1)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6C7884', padding: '2px 8px', borderRadius: 6, fontSize: 16, lineHeight: 1 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#7133D9')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#6C7884')}
                    >›</button>
                  </div>
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
                            padding: '7px 4px', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                            fontWeight: isActive ? 700 : 400,
                            background: isActive ? '#7133D9' : '#F2F6FA',
                            color: isActive ? 'white' : '#2F3133',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#E7E1FF' }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '#F2F6FA' }}
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
        <div className="mb-2" style={{ fontSize: '11px', color: '#6C7884', textAlign: 'right', direction: 'rtl' }}>
          לחץ על תאריך לבחירה · <kbd style={{ background: '#F2F6FA', border: '1px solid #CED7E0', borderRadius: '3px', padding: '0 4px', color: '#5B6670', fontSize: '10px' }}>Shift</kbd> + לחיצה לבחירת טווח
        </div>
        <div
          className="rounded-3"
          style={{
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x',
            background: '#fff',
            border: '1px solid #CED7E0',
          }}
        >
          <div style={{ minWidth: '520px', paddingBottom: '6px' }}>
            <div className="d-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', direction: 'rtl' }}>
              {['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'].map((day) => (
                <div key={day} className="text-center py-2 small fw-semibold" style={{ borderBottom: '1px solid #E4EAF0', color: '#6C7884', background: '#F8FAFB' }}>
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
                        ? 'repeating-linear-gradient(45deg, rgba(239,68,68,0.1), rgba(239,68,68,0.1) 10px, rgba(239,68,68,0.18) 10px, rgba(239,68,68,0.18) 20px)'
                        : isBlocked
                        ? 'repeating-linear-gradient(45deg, rgba(245,158,11,0.07), rgba(245,158,11,0.07) 10px, rgba(245,158,11,0.12) 10px, rgba(245,158,11,0.12) 20px)'
                        : isSelected
                        ? 'rgba(113, 51, 217, 0.1)'
                        : showTodayHighlight
                        ? 'rgba(113, 51, 217, 0.05)'
                        : '#fff',
                      color: '#2F3133',
                      opacity: isCurrentMonth ? 1 : 0.4,
                      cursor: isBooked ? 'not-allowed' : 'pointer',
                      border: isToday ? '2px solid #7133D9' : isBlockedSelected ? '1px solid rgba(239,68,68,0.5)' : isBlocked ? '1px solid rgba(245,158,11,0.25)' : '1px solid #E4EAF0',
                      borderRadius: '0',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isBooked && !isBlocked) {
                        e.currentTarget.style.background = 'rgba(113, 51, 217, 0.06)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isBooked) {
                        e.currentTarget.style.background = isBlockedSelected
                          ? 'repeating-linear-gradient(45deg, rgba(239,68,68,0.1), rgba(239,68,68,0.1) 10px, rgba(239,68,68,0.18) 10px, rgba(239,68,68,0.18) 20px)'
                          : isBlocked
                          ? 'repeating-linear-gradient(45deg, rgba(245,158,11,0.07), rgba(245,158,11,0.07) 10px, rgba(245,158,11,0.12) 10px, rgba(245,158,11,0.12) 20px)'
                          : isSelected ? 'rgba(113, 51, 217, 0.1)' : showTodayHighlight ? 'rgba(113, 51, 217, 0.05)' : '#fff'
                      }
                    }}
                    onClick={(e) => handleDateToggle(date, e.shiftKey)}
                  >
                    {holiday && <HolidayIndicator holiday={holiday} isMobile={isMobile} />}
                    <span
                      className="fw-semibold"
                      style={{ position: 'absolute', top: '8px', left: '8px', fontSize: '14px', color: isBlocked ? '#F59E0B' : '#2F3133' }}
                    >
                      {date.getDate()}
                    </span>
                    {isToday ? (
                      <span
                        className="badge"
                        style={{ position: 'absolute', top: '8px', right: '8px', background: '#7133D9', color: 'white' }}
                      >
                        היום
                      </span>
                    ) : null}
                    {isBlocked ? (
                      <span
                        className="badge"
                        style={{ position: 'absolute', top: '8px', right: '8px', background: isBlockedSelected ? '#EF4444' : '#F59E0B', color: 'white', fontSize: '10px' }}
                      >
                        {isBlockedSelected ? 'לפתיחה' : 'חסום'}
                      </span>
                    ) : null}
                    <div className="small mt-1" style={{ color: isBlockedSelected ? '#EF4444' : isBlocked ? '#F59E0B' : hasPrice ? '#7133D9' : '#CED7E0' }}>
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
                  // 14 half-day columns (2 per weekday) so check-in/check-out days can
                  // show a half-width bar (arrival = PM half, departure = AM half),
                  // letting turnover days visually overlap with the adjoining booking.
                  gridTemplateColumns: 'repeat(14, 1fr)',
                  gridTemplateRows: `repeat(${weeksCount}, 1fr)`,
                  gap: '6px',
                  padding: '8px',
                  pointerEvents: 'none',
                  direction: 'rtl',
                }}
              >
                {bookingSegments.map((segment) => {
                  const isSelected = selectedReservation?.id === segment.reservationId
                  return (
                  <button
                    type="button"
                    key={segment.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      const reservation = reservations.find((r) => r.id === segment.reservationId) ?? null
                      setSelectedReservation(reservation)
                      setSelectedDates([])
                    }}
                    style={{
                      gridColumn: `${segment.startCol + 1} / ${segment.endCol + 2}`,
                      gridRow: segment.row + 1,
                      alignSelf: 'center',
                      justifySelf: 'stretch',
                      height: '20px',
                      borderRadius: '999px',
                      padding: '0 10px',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      marginTop: '52px',
                      cursor: 'pointer',
                      pointerEvents: 'auto',
                      textAlign: 'start' as const,
                      appearance: 'none' as const,
                      boxShadow: isSelected ? '0 0 0 2px #7133D9' : undefined,
                      ...getSegmentBarStyle(segment.status),
                    }}
                    title={segment.status === 'request' ? `בקשת הזמנה: ${segment.label}` : segment.label}
                  >
                    {segment.status === 'request' ? `בקשה · ${segment.label}` : segment.label}
                  </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="col-lg-4">
        <div className="card h-100" style={{ background: '#fff', border: '1px solid #CED7E0', borderRadius: '8px', boxShadow: 'none' }}>
          <div className="card-body">
            <h3 className="h6 fw-semibold mb-3" style={{ color: '#2F3133' }}>שינוי מחיר לפי תאריך</h3>
            <div className="small mb-3" style={{ color: '#6C7884' }}>
              בחר תאריכים בלוח משמאל — עדכן מחיר או סגור להזמנות. לחץ על תאריך חסום כדי לסמן אותו לפתיחה.
            </div>
            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label small fw-semibold" style={{ color: '#5B6670' }}>
                  מחיר ללילה (₪) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  className="form-control"
                  style={{ background: '#fff', border: '1px solid #CED7E0', color: '#2F3133' }}
                  value={priceInput}
                  onChange={(event) => setPriceInput(event.target.value)}
                  required
                />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold" style={{ color: '#5B6670' }}>מינימום לילות</label>
                <input
                  type="number"
                  min={1}
                  className="form-control"
                  style={{ background: '#fff', border: '1px solid #CED7E0', color: '#2F3133' }}
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
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn flex-fill d-flex flex-column align-items-center justify-content-center gap-1"
                style={{
                  background: !selectedDates.length || !priceInput.trim() ? '#F2F6FA' : '#7133D9',
                  border: 'none',
                  color: !selectedDates.length || !priceInput.trim() ? '#6C7884' : 'white',
                  padding: '8px 4px', fontSize: '11px', lineHeight: 1.2, borderRadius: '6px',
                }}
                onClick={applyPrice}
                disabled={!selectedDates.length || !priceInput.trim() || saving}
                title={allSelectedAreBlocked ? 'עדכן מחיר ופתח תאריכים' : 'עדכן מחיר לתאריכים שנבחרו'}
                aria-label={allSelectedAreBlocked ? 'עדכן מחיר ופתח תאריכים' : 'עדכן מחיר לתאריכים שנבחרו'}
              >
                <Tag size={16} />
                <span>{saving ? 'שומר...' : allSelectedAreBlocked ? 'עדכן ופתח' : 'עדכן מחיר'}</span>
              </button>
              <button
                type="button"
                className="btn flex-fill d-flex flex-column align-items-center justify-content-center gap-1"
                style={{
                  background: selectedDates.length && !selectedHasBooked && selectedFreeDates.length > 0 ? '#EF4444' : '#FEF2F2',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: selectedDates.length && !selectedHasBooked && selectedFreeDates.length > 0 ? 'white' : '#EF4444',
                  padding: '8px 4px', fontSize: '11px', lineHeight: 1.2, borderRadius: '6px',
                }}
                onClick={blockDates}
                disabled={!selectedFreeDates.length || selectedHasBooked || saving}
                title={selectedHasBooked ? 'לא ניתן לסגור תאריכים עם הזמנות קיימות' : 'סגור תאריכים חופשיים נבחרים להזמנות'}
                aria-label="סגור להזמנות"
              >
                <Lock size={16} />
                <span>{saving ? 'שומר...' : 'סגור'}</span>
              </button>
              <button
                type="button"
                className="btn flex-fill d-flex flex-column align-items-center justify-content-center gap-1"
                style={{
                  background: selectedBlockedDates.length > 0 ? '#10B981' : '#F0FDF4',
                  border: '1px solid rgba(16,185,129,0.3)',
                  color: selectedBlockedDates.length > 0 ? 'white' : '#10B981',
                  padding: '8px 4px', fontSize: '11px', lineHeight: 1.2, borderRadius: '6px',
                }}
                onClick={unblockDates}
                disabled={!selectedBlockedDates.length || saving}
                title="שחרר חסימה לתאריכים חסומים שנבחרו"
                aria-label="שחרר חסימה"
              >
                <Unlock size={16} />
                <span>{saving ? 'שומר...' : 'שחרר'}</span>
              </button>
            </div>
            {/* ── Selected dates ── */}
            <div className="mt-3" style={{ background: '#F7F5FF', border: '1px solid #E7E1FF', borderRadius: 10, padding: '12px 14px' }}>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="small fw-semibold" style={{ color: '#7133D9' }}>תאריכים שנבחרו</div>
                {selectedDates.length ? (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ border: '1px solid #CED7E0', color: '#5B6670', backgroundColor: '#F2F6FA', fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px' }}
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
                    <span key={toKey(date)} className="badge" style={{ background: '#EFEBFF', color: '#7133D9', fontWeight: 500 }}>
                      {new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: 'short' }).format(date)}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="small" style={{ color: '#6C7884' }}>לא נבחרו תאריכים.</div>
              )}
            </div>

            {/* ── Legend ── */}
            <div className="mt-3" style={{ background: '#F8FAFB', border: '1px solid #E4EAF0', borderRadius: 10, padding: '12px 14px' }}>
              <div className="small fw-semibold mb-2" style={{ color: '#5B6670' }}>מקרא</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 4px' }}>
                {[
                  { badge: 'תפוס',    bg: 'rgba(16,185,129,0.15)', color: '#065F46', label: 'הזמנה קיימת' },
                  { badge: 'חסום',    bg: '#FEF3C7',                color: '#D97706', label: 'חסום ב-Beds24' },
                  { badge: 'לפתיחה', bg: '#EF4444',                color: '#fff',    label: 'נבחר לפתיחה' },
                  { badge: 'נבחר',    bg: '#EFEBFF',               color: '#7133D9', label: 'לעדכון / סגירה' },
                ].map(({ badge, bg, color, label }) => (
                  <div key={badge} style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                    <span style={{
                      background: bg, color, fontSize: 10, fontWeight: 600,
                      padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0,
                    }}>{badge}</span>
                    <span style={{ fontSize: 11, color: '#6C7884', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 13, flexShrink: 0 }}>🚩</span>
                  <span style={{ fontSize: 11, color: '#6C7884' }}>חג יהודי</span>
                </div>
              </div>
            </div>

            {/* ── Reservation details ── */}
            <div className="mt-3" ref={reservationDetailsRef} style={{ background: '#FFFDF7', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 14px' }}>
              <div className="small fw-semibold mb-2" style={{ color: '#92400E' }}>
                {selectedReservation?.status === 'request' ? 'פרטי בקשת הזמנה' : 'פרטי הזמנה'}
              </div>
              {selectedReservation ? (
                <div
                  className="rounded-3"
                  style={{
                    background: 'transparent',
                    border: 'none',
                  }}
                >
                  <div className="fw-semibold" style={{ color: '#2F3133' }}>{selectedReservation.guestName}</div>
                  <div className="small" style={{ color: '#6C7884' }}>{selectedReservation.checkIn} - {selectedReservation.checkOut}</div>
                  <div className="small mt-2" style={{ color: '#5B6670' }}><span className="fw-semibold">סטטוס:</span> {formatStatus(selectedReservation.status)}</div>
                  {selectedReservation.status === 'request' ? (
                    <div className="small mt-1" style={{ color: '#D97706' }}>ממתין לאישורך בערוץ ההזמנות (Beds24 / Airbnb)</div>
                  ) : null}
                  <div className="small" style={{ color: '#5B6670' }}><span className="fw-semibold">לילות:</span> {selectedReservation.nights}</div>
                  <div className="small" style={{ color: '#5B6670' }}><span className="fw-semibold">סה״כ:</span> {formatCurrency(selectedReservation.total)}</div>
                  {selectedReservation.source ? (
                    <div className="small" style={{ color: '#5B6670' }}><span className="fw-semibold">מקור:</span> {selectedReservation.source}</div>
                  ) : null}
                  {selectedReservation.unitName ? (
                    <div className="small" style={{ color: '#5B6670' }}><span className="fw-semibold">יחידה:</span> {selectedReservation.unitName}</div>
                  ) : null}
                  {selectedReservation.phone ? (
                    <div className="small" style={{ color: '#5B6670' }}><span className="fw-semibold">טלפון:</span> <span dir="ltr">{selectedReservation.phone}</span></div>
                  ) : null}
                  {selectedReservation.guests || selectedReservation.adults ? (
                    <div className="small" style={{ color: '#5B6670' }}><span className="fw-semibold">אורחים:</span> {selectedReservation.guests || selectedReservation.adults}</div>
                  ) : null}
                  {selectedReservation.apiReference ? (
                    <div className="small" style={{ color: '#5B6670' }}><span className="fw-semibold">מזהה ערוץ:</span> <span dir="ltr">{selectedReservation.apiReference}</span></div>
                  ) : null}
                  {selectedReservation.channelUrl ? (
                    <a
                      href={selectedReservation.channelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm d-inline-flex align-items-center gap-2 mt-3"
                      style={{
                        background: selectedReservation.status === 'request' ? '#FEF3C7' : '#EFEBFF',
                        border: selectedReservation.status === 'request' ? '1px solid #F59E0B' : '1px solid #7133D9',
                        color: selectedReservation.status === 'request' ? '#D97706' : '#7133D9',
                        borderRadius: '6px',
                        textDecoration: 'none',
                      }}
                    >
                      <ExternalLink size={14} />
                      {channelLinkLabel(selectedReservation.source)}
                    </a>
                  ) : null}
                </div>
              ) : (
                <div className="small" style={{ color: '#6C7884' }}>
                  לחץ על הזמנה או בקשה בלוח כדי לראות פרטים.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CalendarPricing
