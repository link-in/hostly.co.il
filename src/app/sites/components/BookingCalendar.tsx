'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useHolidays } from '@/hooks/useHolidays'
import HolidayIndicator from '@/components/HolidayIndicator'

// Date utility functions
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

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)

type AvailabilityData = {
  date: string
  price: number
  available: boolean
  minStay: number
}

type BookingCalendarProps = {
  onClose?: () => void
}

export default function BookingCalendar({ onClose }: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [checkInDate, setCheckInDate] = useState<Date | null>(null)
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(null)
  const [availability, setAvailability] = useState<AvailabilityData[]>([])
  const [loading, setLoading] = useState(true)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  // Load Hebrew holidays for the current month
  const { holidays } = useHolidays(currentMonth)
  
  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [numAdult, setNumAdult] = useState(2)
  const [numChild, setNumChild] = useState(0)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  
  // Price calculation state
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null)
  const [calculatingPrice, setCalculatingPrice] = useState(false)
  const [priceBreakdown, setPriceBreakdown] = useState<any>(null)

  const today = normalizeDate(new Date())
  const todayKey = toKey(today)
  
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

  // Build availability map
  const availabilityMap = useMemo(() => {
    const map: Record<string, AvailabilityData> = {}
    availability.forEach((item) => {
      map[item.date] = item
    })
    return map
  }, [availability])

  // Fetch availability for current month and next 2 months
  useEffect(() => {
    const fetchAvailability = async () => {
      setLoading(true)
      try {
        const start = startOfMonth(currentMonth)
        const end = endOfMonth(addMonths(currentMonth, 2))
        
        const from = toKey(start)
        const to = toKey(end)
        
        const response = await fetch(`/api/public/availability?from=${from}&to=${to}`)
        if (!response.ok) {
          throw new Error('Failed to fetch availability')
        }
        
        const data = await response.json()
        setAvailability(data.dates || [])
      } catch (error) {
        console.error('Error fetching availability:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchAvailability()
  }, [currentMonth])

  // Build calendar days
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

  const handleDateClick = (date: Date) => {
    const key = toKey(date)
    const dayInfo = availabilityMap[key]
    
    // Can't select past dates
    if (date < today) {
      return
    }
    
    // Can't select unavailable dates
    if (!dayInfo?.available) {
      return
    }

    // First click = check-in
    if (!checkInDate) {
      setCheckInDate(date)
      setCheckOutDate(null)
      return
    }

    // Second click = check-out
    if (checkInDate && !checkOutDate) {
      if (date <= checkInDate) {
        // Reset if selecting earlier date
        setCheckInDate(date)
        setCheckOutDate(null)
      } else {
        // Validate all dates in range are available
        let cursor = addDays(checkInDate, 1)
        let allAvailable = true
        while (cursor < date) {
          const cursorKey = toKey(cursor)
          const cursorInfo = availabilityMap[cursorKey]
          if (!cursorInfo?.available) {
            allAvailable = false
            break
          }
          cursor = addDays(cursor, 1)
        }
        
        if (allAvailable) {
          setCheckOutDate(date)
        } else {
          // Can't book - there are unavailable days in range
          setCheckInDate(date)
          setCheckOutDate(null)
        }
      }
      return
    }

    // Third click = reset
    setCheckInDate(date)
    setCheckOutDate(null)
  }

  const getDayClassName = (date: Date) => {
    const key = toKey(date)
    const dayInfo = availabilityMap[key]
    const isToday = key === todayKey
    const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
    const isPast = date < today
    const isAvailable = dayInfo?.available
    const isCheckIn = checkInDate && isSameDay(date, checkInDate)
    const isCheckOut = checkOutDate && isSameDay(date, checkOutDate)
    
    let isInRange = false
    if (checkInDate && checkOutDate) {
      isInRange = date > checkInDate && date < checkOutDate
    }

    let classes = 'calendar-day'
    
    if (!isCurrentMonth) {
      classes += ' other-month'
    }
    
    if (isPast) {
      classes += ' past'
    } else if (!isAvailable) {
      classes += ' unavailable'
    } else if (isCheckIn) {
      classes += ' check-in'
    } else if (isCheckOut) {
      classes += ' check-out'
    } else if (isInRange) {
      classes += ' in-range'
    } else if (isAvailable) {
      classes += ' available'
    }
    
    if (isToday) {
      classes += ' today'
    }
    
    return classes
  }

  const calculateTotal = () => {
    if (!checkInDate || !checkOutDate) {
      return { nights: 0, total: 0 }
    }
    
    let cursor = checkInDate
    let nights = 0
    let total = 0
    
    while (cursor < checkOutDate) {
      const key = toKey(cursor)
      const dayInfo = availabilityMap[key]
      total += dayInfo?.price || 0
      nights += 1
      cursor = addDays(cursor, 1)
    }
    
    return { nights, total }
  }

  // Calculate price when dates or guest numbers change
  useEffect(() => {
    if (!checkInDate || !checkOutDate) {
      setCalculatedPrice(null)
      setPriceBreakdown(null)
      return
    }

    const calculatePrice = async () => {
      setCalculatingPrice(true)
      try {
        const response = await fetch('/api/public/calculate-price', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            checkIn: toKey(checkInDate),
            checkOut: toKey(checkOutDate),
            numAdult,
            numChild,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to calculate price')
        }

        const data = await response.json()
        setCalculatedPrice(data.price)
        setPriceBreakdown(data.breakdown)
      } catch (error) {
        console.error('Error calculating price:', error)
        // Fallback to simple calculation
        const { total } = calculateTotal()
        setCalculatedPrice(total)
        setPriceBreakdown(null)
      } finally {
        setCalculatingPrice(false)
      }
    }

    calculatePrice()
  }, [checkInDate, checkOutDate, numAdult, numChild])

  const handleBookNow = () => {
    if (checkInDate && checkOutDate) {
      setShowBookingForm(true)
    }
  }

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!checkInDate || !checkOutDate) {
      return
    }
    
    setSubmitting(true)
    setBookingError(null)
    
    try {
      const response = await fetch('/api/public/booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          checkIn: toKey(checkInDate),
          checkOut: toKey(checkOutDate),
          numAdult,
          numChild,
          notes,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create booking')
      }
      
      const result = await response.json()
      setBookingSuccess(true)
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setCheckInDate(null)
        setCheckOutDate(null)
        setShowBookingForm(false)
        setBookingSuccess(false)
        setFirstName('')
        setLastName('')
        setEmail('')
        setPhone('')
        setNumAdult(2)
        setNotes('')
        if (onClose) {
          onClose()
        }
      }, 3000)
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'שגיאה ביצירת ההזמנה')
    } finally {
      setSubmitting(false)
    }
  }

  const monthLabel = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(currentMonth)
  const { nights } = calculateTotal()
  const total = calculatedPrice !== null ? calculatedPrice : 0

  if (bookingSuccess) {
    return (
      <div className="booking-success">
        <div className="success-icon">✓</div>
        <h3>ההזמנה נוצרה בהצלחה!</h3>
        <p>תקבל אישור בהודעת WhatsApp בקרוב.</p>
      </div>
    )
  }

  if (showBookingForm) {
    return (
      <div style={{
        width: '100%',
        maxWidth: '600px',
        margin: '0 auto',
        direction: 'rtl'
      }}>
        <button 
          onClick={() => setShowBookingForm(false)}
          style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            border: '2px solid #667eea',
            color: '#667eea',
            fontSize: '1rem',
            cursor: 'pointer',
            marginBottom: '20px',
            padding: '10px 20px',
            borderRadius: '25px',
            fontWeight: 600,
            transition: 'all 0.3s'
          }}
        >
          ← חזרה ללוח שנה
        </button>
        
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '25px',
          borderRadius: '16px',
          marginBottom: '25px',
          boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
        }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.4rem', textAlign: 'center' }}>פרטי ההזמנה</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '15px',
            background: 'rgba(255, 255, 255, 0.15)',
            padding: '15px',
            borderRadius: '10px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <strong>כניסה:</strong> {checkInDate?.toLocaleDateString('he-IL')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <strong>יציאה:</strong> {checkOutDate?.toLocaleDateString('he-IL')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <strong>לילות:</strong> {nights}
            </div>
            <div style={{
              gridColumn: '1 / -1',
              fontSize: '1.5rem',
              paddingTop: '15px',
              marginTop: '15px',
              borderTop: '2px solid rgba(255, 255, 255, 0.3)',
              textAlign: 'center',
              fontWeight: 700
            }}>
              {calculatingPrice ? (
                <><strong>מחשב מחיר...</strong></>
              ) : calculatedPrice !== null ? (
                <>
                  <strong>סה"כ:</strong> ₪{calculatedPrice.toLocaleString()}
                  {priceBreakdown && priceBreakdown.totalSurcharge > 0 && (
                    <div style={{ fontSize: '0.85rem', fontWeight: 400, marginTop: '5px', opacity: 0.9 }}>
                      (כולל תוספת עבור {priceBreakdown.extraAdults > 0 && `${priceBreakdown.extraAdults} מבוגרים נוספים`}
                      {priceBreakdown.extraAdults > 0 && priceBreakdown.extraChildren > 0 && ' + '}
                      {priceBreakdown.extraChildren > 0 && `${priceBreakdown.extraChildren} ילדים`})
                    </div>
                  )}
                </>
              ) : (
                <><strong>בחר תאריכים</strong></>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmitBooking} style={{
          background: 'white',
          padding: '30px',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, color: '#333', fontSize: '0.95rem' }}>שם פרטי *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  background: '#fafafa',
                  transition: 'all 0.3s'
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, color: '#333', fontSize: '0.95rem' }}>שם משפחה *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  background: '#fafafa',
                  transition: 'all 0.3s'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, color: '#333', fontSize: '0.95rem' }}>אימייל *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '2px solid #e0e0e0',
                borderRadius: '10px',
                fontSize: '1rem',
                background: '#fafafa',
                transition: 'all 0.3s'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, color: '#333', fontSize: '0.95rem' }}>טלפון *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="05xxxxxxxx"
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '2px solid #e0e0e0',
                borderRadius: '10px',
                fontSize: '1rem',
                background: '#fafafa',
                transition: 'all 0.3s'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, color: '#333', fontSize: '0.95rem' }}>מבוגרים *</label>
              <select
                value={numAdult}
                onChange={(e) => setNumAdult(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  background: '#fafafa',
                  transition: 'all 0.3s'
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                  <option key={num} value={num}>{num} מבוגרים</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, color: '#333', fontSize: '0.95rem' }}>ילדים</label>
              <select
                value={numChild}
                onChange={(e) => setNumChild(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  background: '#fafafa',
                  transition: 'all 0.3s'
                }}
              >
                {[0, 1, 2, 3, 4, 5, 6].map(num => (
                  <option key={num} value={num}>{num === 0 ? 'ללא ילדים' : `${num} ילדים`}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, color: '#333', fontSize: '0.95rem' }}>הערות (אופציונלי)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="בקשות מיוחדות, שעת הגעה משוערת, וכו'"
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '2px solid #e0e0e0',
                borderRadius: '10px',
                fontSize: '1rem',
                background: '#fafafa',
                transition: 'all 0.3s',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {bookingError && (
            <div style={{
              background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
              color: '#c62828',
              padding: '15px',
              borderRadius: '10px',
              marginBottom: '20px',
              textAlign: 'center',
              fontWeight: 600,
              border: '2px solid #ef5350'
            }}>
              {bookingError}
            </div>
          )}

          {/* תצוגת מחיר סופי */}
          {calculatedPrice !== null && (
            <div style={{
              background: 'linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%)',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '20px',
              textAlign: 'center',
              border: '2px solid #667eea'
            }}>
              <div style={{ fontSize: '0.95rem', color: '#666', marginBottom: '8px' }}>
                סכום לתשלום
              </div>
              <div style={{ 
                fontSize: '2.2rem', 
                fontWeight: 700, 
                color: '#667eea',
                marginBottom: '8px'
              }}>
                ₪{calculatedPrice.toLocaleString()}
              </div>
              {priceBreakdown && (
                <div style={{ fontSize: '0.85rem', color: '#888' }}>
                  {nights} {nights === 1 ? 'לילה אחד' : 'לילות'} • {priceBreakdown.numAdult} מבוגרים
                  {priceBreakdown.numChild > 0 && ` • ${priceBreakdown.numChild} ילדים`}
                  {priceBreakdown.totalSurcharge > 0 && (
                    <div style={{ marginTop: '5px', color: '#667eea' }}>
                      כולל תוספת אורחים: ₪{priceBreakdown.totalSurcharge.toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              background: submitting ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '16px',
              borderRadius: '12px',
              fontSize: '1.15rem',
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)',
              marginTop: '10px',
              opacity: submitting ? 0.5 : 1
            }}
          >
            {submitting ? 'שולח...' : 'אשר הזמנה'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="booking-calendar">
      <div className="calendar-header">
        <button 
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          title="חודש קדימה"
        >
          → קדימה
        </button>
        <h3>{monthLabel}</h3>
        <button 
          onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
          title="חודש אחורה"
        >
          אחורה ←
        </button>
      </div>

      {loading ? (
        <div className="calendar-loading">טוען...</div>
      ) : (
        <>
          <div className="calendar-grid">
            <div className="weekday-header">א</div>
            <div className="weekday-header">ב</div>
            <div className="weekday-header">ג</div>
            <div className="weekday-header">ד</div>
            <div className="weekday-header">ה</div>
            <div className="weekday-header">ו</div>
            <div className="weekday-header">ש</div>

            {days.map((date, index) => {
              const key = toKey(date)
              const dayInfo = availabilityMap[key]
              const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
              const holiday = holidays.get(key)
              
              return (
                <div
                  key={index}
                  className={getDayClassName(date)}
                  onClick={() => handleDateClick(date)}
                  style={{ position: 'relative' }}
                >
                  {holiday && <HolidayIndicator holiday={holiday} isMobile={isMobile} />}
                  <div className="day-number">{date.getDate()}</div>
                  {isCurrentMonth && dayInfo?.available && (
                    <div className="day-price">₪{dayInfo.price}</div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="calendar-legend">
            <div className="legend-item">
              <span className="legend-color available"></span>
              <span>זמין</span>
            </div>
            <div className="legend-item">
              <span className="legend-color unavailable"></span>
              <span>תפוס</span>
            </div>
            <div className="legend-item">
              <span className="legend-color selected"></span>
              <span>נבחר</span>
            </div>
          </div>

          {checkInDate && checkOutDate && (
            <div className="selection-summary">
              <div className="summary-content">
                <div className="summary-dates">
                  <div>
                    <strong>כניסה:</strong> {checkInDate.toLocaleDateString('he-IL')}
                  </div>
                  <div>
                    <strong>יציאה:</strong> {checkOutDate.toLocaleDateString('he-IL')}
                  </div>
                  <div>
                    <strong>{nights} לילות</strong>
                  </div>
                </div>
              </div>
              <button className="book-now-button" onClick={handleBookNow}>
                המשך להזמנה
              </button>
            </div>
          )}

          {!checkInDate && (
            <div className="selection-hint">
              בחר תאריך כניסה ויציאה להזמנה
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .booking-calendar {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          direction: rtl;
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 0 10px;
        }

        .calendar-header h3 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #333;
        }

        .calendar-header button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          color: white;
          padding: 10px 20px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          transition: transform 0.2s;
          white-space: nowrap;
        }

        .calendar-header button:hover {
          transform: scale(1.1);
        }

        .calendar-loading {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 20px;
        }

        .weekday-header {
          text-align: center;
          font-weight: 600;
          padding: 8px;
          color: #666;
          font-size: 0.9rem;
        }

        .calendar-day {
          aspect-ratio: 1;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          padding: 3px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          background: white;
          min-height: 50px;
          max-height: 65px;
        }

        .calendar-day.other-month {
          opacity: 0.3;
        }

        .calendar-day.past {
          background: #f5f5f5;
          cursor: not-allowed;
          color: #999;
        }

        .calendar-day.unavailable {
          background: #ffebee;
          border-color: #ef5350;
          cursor: not-allowed;
          color: #999;
        }

        .calendar-day.available:hover {
          border-color: #667eea;
          transform: scale(1.05);
        }

        .calendar-day.check-in,
        .calendar-day.check-out {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: #667eea;
          color: white;
        }

        .calendar-day.in-range {
          background: #e3f2fd;
          border-color: #2196f3;
        }

        .calendar-day.today {
          box-shadow: 0 0 0 3px #ff9800;
        }

        .day-number {
          font-weight: 600;
          font-size: 0.85rem;
          margin-bottom: 1px;
        }

        .day-price {
          font-size: 0.7rem;
          color: #666;
        }

        .calendar-day.check-in .day-price,
        .calendar-day.check-out .day-price {
          color: white;
        }

        .calendar-legend {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-bottom: 20px;
          padding: 15px;
          background: #f9f9f9;
          border-radius: 8px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
        }

        .legend-color {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          border: 2px solid #ddd;
        }

        .legend-color.available {
          background: white;
          border-color: #e0e0e0;
        }

        .legend-color.unavailable {
          background: #ffebee;
          border-color: #ef5350;
        }

        .legend-color.selected {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: #667eea;
        }

        .selection-hint {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 1.1rem;
        }

        .selection-summary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 12px;
          margin-top: 20px;
        }

        .summary-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .summary-dates {
          display: flex;
          gap: 20px;
        }

        .summary-total {
          text-align: left;
        }

        .total-label {
          font-size: 0.9rem;
          opacity: 0.9;
        }

        .total-amount {
          font-size: 1.8rem;
          font-weight: 700;
        }

        .book-now-button {
          width: 100%;
          background: white;
          color: #667eea;
          border: none;
          padding: 15px;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .book-now-button:hover {
          transform: scale(1.02);
        }

        .booking-form-container {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          direction: rtl;
        }

        .back-button {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          border: 2px solid #667eea;
          color: #667eea;
          font-size: 1rem;
          cursor: pointer;
          margin-bottom: 20px;
          padding: 10px 20px;
          border-radius: 25px;
          font-weight: 600;
          transition: all 0.3s;
        }

        .back-button:hover {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          transform: translateX(5px);
        }

        .booking-summary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 25px;
          border-radius: 16px;
          margin-bottom: 25px;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
        }

        .booking-summary h3 {
          margin: 0 0 20px 0;
          font-size: 1.4rem;
          text-align: center;
        }

        .dates-summary {
          display: flex;
          flex-direction: row;
          justify-content: space-around;
          align-items: center;
          gap: 20px;
          background: rgba(255, 255, 255, 0.15);
          padding: 15px;
          border-radius: 10px;
          flex-wrap: wrap;
        }

        .dates-summary > div {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .total-price {
          grid-column: 1 / -1;
          font-size: 1.5rem;
          padding-top: 15px;
          margin-top: 15px;
          border-top: 2px solid rgba(255, 255, 255, 0.3);
          text-align: center;
          font-weight: 700;
        }

        .booking-form {
          background: white;
          padding: 30px;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 10px;
          font-weight: 600;
          color: #333;
          font-size: 0.95rem;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-size: 1rem;
          transition: all 0.3s;
          background: #fafafa;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #667eea;
          background: white;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .form-group textarea {
          resize: vertical;
          font-family: inherit;
        }

        .submit-booking-button {
          width: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 16px;
          border-radius: 12px;
          font-size: 1.15rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
          margin-top: 10px;
        }

        .submit-booking-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(102, 126, 234, 0.4);
        }

        .submit-booking-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .error-message {
          background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
          color: #c62828;
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 20px;
          text-align: center;
          font-weight: 600;
          border: 2px solid #ef5350;
        }

        .booking-success {
          text-align: center;
          padding: 60px 20px;
        }

        .success-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          margin: 0 auto 20px;
        }

        .booking-success h3 {
          color: #4caf50;
          margin-bottom: 10px;
        }

        .booking-success p {
          color: #666;
          font-size: 1.1rem;
        }

        @media (max-width: 768px) {
          .calendar-grid {
            gap: 4px;
          }

          .calendar-day {
            padding: 4px;
          }

          .day-number {
            font-size: 0.9rem;
          }

          .day-price {
            font-size: 0.75rem;
          }

          .summary-content {
            flex-direction: column;
            align-items: stretch;
            gap: 15px;
          }

          .summary-dates {
            flex-direction: column;
            gap: 10px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
