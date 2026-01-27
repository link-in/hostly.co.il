'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { Reservation, RoomPrice } from '@/lib/dashboard/types'
import { formatCurrency } from '@/lib/dashboard/utils'
import { getDashboardProvider } from '@/lib/dashboard/getDashboardProvider'
import ReservationsTable from './components/ReservationsTable'
import StatCard from './components/StatCard'
import CalendarPricing from './components/CalendarPricing'
import DashboardHeader from '@/components/DashboardHeader'

const toLocalKey = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeDate = (value: Date) => {
  const normalized = new Date(value)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

const addDays = (value: Date, days: number) => {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

// Session Storage helpers for demo mode reservations
const DEMO_RESERVATIONS_KEY = 'hostly_demo_reservations'

// LocalStorage key for viewed reservations
const VIEWED_RESERVATIONS_KEY = 'hostly_viewed_reservations'

// Get list of viewed reservation IDs
const getViewedReservations = (): Set<string> => {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem(VIEWED_RESERVATIONS_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

// Mark reservation as viewed
const markReservationAsViewed = (reservationId: string) => {
  if (typeof window === 'undefined') return
  try {
    const viewed = getViewedReservations()
    viewed.add(reservationId)
    localStorage.setItem(VIEWED_RESERVATIONS_KEY, JSON.stringify([...viewed]))
  } catch (error) {
    console.error('Failed to mark reservation as viewed:', error)
  }
}

// Mark reservations created in the last 3 days as "new" (unless already viewed)
const markNewReservations = (reservations: Reservation[]): Reservation[] => {
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  const viewedIds = getViewedReservations()
  
  return reservations.map(reservation => {
    // Skip if already viewed
    if (viewedIds.has(reservation.id)) {
      return reservation
    }
    
    if (reservation.isNew) {
      // Already marked (e.g., demo reservations)
      return reservation
    }
    
    if (reservation.createdAt) {
      const createdDate = new Date(reservation.createdAt)
      if (!Number.isNaN(createdDate.getTime()) && createdDate >= threeDaysAgo) {
        return { ...reservation, isNew: true }
      }
    }
    
    return reservation
  })
}

const saveDemoReservation = (reservation: Reservation) => {
  if (typeof window === 'undefined') return
  
  try {
    const existing = sessionStorage.getItem(DEMO_RESERVATIONS_KEY)
    const reservations: Reservation[] = existing ? JSON.parse(existing) : []
    reservations.push(reservation)
    sessionStorage.setItem(DEMO_RESERVATIONS_KEY, JSON.stringify(reservations))
    console.log('💾 Demo reservation saved to session storage', reservation)
  } catch (error) {
    console.error('Failed to save demo reservation:', error)
  }
}

const loadDemoReservations = (): Reservation[] => {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = sessionStorage.getItem(DEMO_RESERVATIONS_KEY)
    if (stored) {
      const reservations = JSON.parse(stored) as Reservation[]
      console.log(`📥 Loaded ${reservations.length} demo reservations from session storage`)
      return reservations
    }
  } catch (error) {
    console.error('Failed to load demo reservations:', error)
  }
  return []
}

const clearDemoReservations = () => {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(DEMO_RESERVATIONS_KEY)
  console.log('🗑️ Demo reservations cleared')
}

const DashboardClient = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Get provider based on user (demo users get mock data)
  const { provider, meta } = useMemo(() => getDashboardProvider(session?.user), [session?.user])
  
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [roomPrices, setRoomPrices] = useState<RoomPrice[]>([])
  const [loadingReservations, setLoadingReservations] = useState(true)
  const [loadingRoomPrices, setLoadingRoomPrices] = useState(true)
  const [reservationsError, setReservationsError] = useState<string | null>(null)
  const [roomPricesError, setRoomPricesError] = useState<string | null>(null)
  const [showNewReservation, setShowNewReservation] = useState(false)
  const [savingReservation, setSavingReservation] = useState(false)
  const [saveReservationError, setSaveReservationError] = useState<string | null>(null)
  const [saveReservationSuccess, setSaveReservationSuccess] = useState<string | null>(null)
  const [newReservation, setNewReservation] = useState({
    firstName: '',
    lastName: '',
    contact: '',
    arrival: '',
    departure: '',
    guests: 2,
    total: '',
    notes: '',
  })
  const [sendWhatsApp, setSendWhatsApp] = useState(true) // Default: send WhatsApp
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('oldest') // מיון לפי הקרוב ביותר
  const [commissionRates, setCommissionRates] = useState<Record<string, number>>({
    booking: 0.15, // Default fallback
    airbnb: 0.16,  // Default fallback
  })

  const updateReservationField = (field: keyof typeof newReservation, value: string | number) => {
    setNewReservation((prev) => {
      const updated = { ...prev, [field]: value }
      
      // אם מעדכנים את תאריך הכניסה, נציע אוטומטית תאריך יציאה ליום למחרת
      if (field === 'arrival' && typeof value === 'string') {
        const newArrival = new Date(value)
        const currentDeparture = prev.departure ? new Date(prev.departure) : null
        
        // אם אין תאריך יציאה או שהוא לא תקין, נציע יום למחרת
        if (!currentDeparture || currentDeparture <= newArrival) {
          const nextDay = new Date(newArrival)
          nextDay.setDate(nextDay.getDate() + 1)
          updated.departure = nextDay.toISOString().split('T')[0]
        }
      }
      
      return updated
    })
  }

  const resetReservationForm = () => {
    setNewReservation({
      firstName: '',
      lastName: '',
      contact: '',
      arrival: '',
      departure: '',
      guests: 2,
      total: '',
      notes: '',
    })
    setSendWhatsApp(true) // Reset to default: send WhatsApp
  }

  const refreshRoomPrices = async () => {
    setLoadingRoomPrices(true)
    try {
      const prices = await provider.getRoomPrices()
      setRoomPrices(prices)
      setRoomPricesError(null)
    } catch (error) {
      setRoomPricesError(error instanceof Error ? error.message : 'טעינת מחירי לילה נכשלה')
    } finally {
      setLoadingRoomPrices(false)
    }
  }

  const refreshReservations = async () => {
    setLoadingReservations(true)
    try {
      const reservationsResult = await provider.getReservations()
      
      // If demo mode, merge with session storage reservations
      if (meta.isMock && session?.user?.isDemo) {
        const demoReservations = loadDemoReservations()
        const combined = [...demoReservations, ...reservationsResult]
        console.log(`🎭 Demo mode: ${demoReservations.length} new + ${reservationsResult.length} mock = ${combined.length} total`)
        setReservations(markNewReservations(combined))
      } else {
        // Mark new reservations (created in last 7 days)
        setReservations(markNewReservations(reservationsResult))
      }
      
      setReservationsError(null)
    } catch (error) {
      setReservationsError(error instanceof Error ? error.message : 'טעינת הזמנות נכשלה')
    } finally {
      setLoadingReservations(false)
    }
  }

  const handleCreateReservation = async () => {
    if (savingReservation) {
      return
    }

    setSaveReservationError(null)
    setSaveReservationSuccess(null)

    if (!newReservation.firstName.trim() || !newReservation.lastName.trim()) {
      setSaveReservationError('יש להזין שם מלא.')
      return
    }
    if (!newReservation.contact.trim()) {
      setSaveReservationError('יש להזין טלפון או אימייל.')
      return
    }
    if (!newReservation.arrival || !newReservation.departure) {
      setSaveReservationError('יש לבחור תאריכי כניסה ויציאה.')
      return
    }
    const arrivalDate = normalizeDate(new Date(newReservation.arrival))
    const departureDate = normalizeDate(new Date(newReservation.departure))
    if (Number.isNaN(arrivalDate.getTime()) || Number.isNaN(departureDate.getTime())) {
      setSaveReservationError('תאריכים לא תקינים.')
      return
    }
    if (arrivalDate >= departureDate) {
      setSaveReservationError('תאריך היציאה חייב להיות אחרי תאריך הכניסה.')
      return
    }
    const hasConflict = reservations.some((reservation) => {
      if (reservation.status === 'cancelled' || !reservation.checkIn || !reservation.checkOut) {
        return false
      }
      const checkIn = normalizeDate(new Date(reservation.checkIn))
      const checkOut = normalizeDate(new Date(reservation.checkOut))
      if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
        return false
      }
      return arrivalDate < checkOut && departureDate > checkIn
    })
    if (hasConflict) {
      setSaveReservationError('קיימת הזמנה בתאריכים שנבחרו.')
      return
    }
    if (!newReservation.total) {
      setSaveReservationError('יש להזין סכום לתשלום.')
      return
    }

    // Detect if contact is phone or email
    const contact = newReservation.contact.trim()
    const isPhone = /^[\d\s\-\+\(\)]+$/.test(contact)
    
    const payload = [
      {
        arrival: newReservation.arrival,
        departure: newReservation.departure,
        firstName: newReservation.firstName.trim(),
        lastName: newReservation.lastName.trim(),
        status: 'confirmed',
        notes: newReservation.notes.trim() || undefined,
        numAdult: newReservation.guests || 1,
        // Add phone or email based on format
        ...(isPhone ? { mobile: contact } : { email: contact }),
        invoice: [
          {
            description: 'Total Room Price',
            amount: Number(newReservation.total),
            qty: 1,
            type: 'item',
          },
        ],
      },
    ]
    console.log('Dashboard create booking payload', payload)

    try {
      setSavingReservation(true)
      const response = await fetch('/api/dashboard/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          bookings: payload,
          sendWhatsApp: sendWhatsApp 
        }),
      })
      console.log('Dashboard create booking response', response.status)
      if (!response.ok) {
        const details = await response.text()
        throw new Error(details || 'Failed to create reservation')
      }
      
      // Check if this is demo mode
      const result = await response.json()
      if (result.demo) {
        // Save to session storage for demo mode
        const demoReservation: Reservation = {
          id: result.booking.id,
          guestName: `${newReservation.firstName} ${newReservation.lastName}`,
          checkIn: newReservation.arrival,
          checkOut: newReservation.departure,
          nights: Math.round(
            (departureDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24)
          ),
          guests: newReservation.guests,
          total: Number(newReservation.total),
          status: 'confirmed',
          source: 'Demo (הזמנה ידנית)',
          phone: isPhone ? contact : undefined,
          email: isPhone ? undefined : contact,
          notes: newReservation.notes.trim() || undefined,
          isNew: true, // Flag for visual indication
        }
        saveDemoReservation(demoReservation)
        setSaveReservationSuccess('🎭 מצב דמו: ההזמנה נשמרה בהצלחה! (שמורה רק בסשן הנוכחי)')
      } else {
        setSaveReservationSuccess('ההזמנה נשמרה בהצלחה.')
      }
      
      await refreshReservations()
      resetReservationForm()
      setShowNewReservation(false)
    } catch (error) {
      setSaveReservationError(error instanceof Error ? error.message : 'שמירת ההזמנה נכשלה')
    } finally {
      setSavingReservation(false)
    }
  }

  // Check authentication - redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log('🔒 User not authenticated, redirecting to login')
      router.push('/dashboard/login')
    }
  }, [status, router])

  useEffect(() => {
    let isActive = true

    const load = async () => {
      const [reservationsResult, roomPricesResult, commissionRatesResult] = await Promise.allSettled([
        provider.getReservations(),
        provider.getRoomPrices(),
        fetch('/api/commission-rates').then(res => res.json()),
      ])

      if (!isActive) {
        return
      }

      if (reservationsResult.status === 'fulfilled') {
        // If demo mode, merge with session storage reservations
        if (meta.isMock && session?.user?.isDemo) {
          const demoReservations = loadDemoReservations()
          const combined = [...demoReservations, ...reservationsResult.value]
          console.log(`🎭 Initial load: ${demoReservations.length} new + ${reservationsResult.value.length} mock = ${combined.length} total`)
          setReservations(markNewReservations(combined))
        } else {
          // Mark new reservations (created in last 7 days)
          setReservations(markNewReservations(reservationsResult.value))
        }
        setReservationsError(null)
      } else {
        setReservationsError(
          reservationsResult.reason instanceof Error ? reservationsResult.reason.message : 'טעינת הזמנות נכשלה'
        )
      }

      if (roomPricesResult.status === 'fulfilled') {
        setRoomPrices(roomPricesResult.value)
        setRoomPricesError(null)
      } else {
        setRoomPricesError(
          roomPricesResult.reason instanceof Error ? roomPricesResult.reason.message : 'טעינת מחירי לילה נכשלה'
        )
      }

      if (commissionRatesResult.status === 'fulfilled') {
        const data = commissionRatesResult.value
        if (data.rates) {
          setCommissionRates(data.rates)
        }
      }

      setLoadingReservations(false)
      setLoadingRoomPrices(false)
    }

    load()
    return () => {
      isActive = false
    }
  }, [provider])

  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>()
    reservations.forEach((reservation) => {
      if (!reservation.checkIn) return
      const checkInDate = new Date(reservation.checkIn)
      if (Number.isNaN(checkInDate.getTime())) return
      const year = checkInDate.getFullYear()
      const month = checkInDate.getMonth() + 1
      monthsSet.add(`${year}-${month.toString().padStart(2, '0')}`)
    })
    return Array.from(monthsSet).sort().reverse()
  }, [reservations])

  const filteredReservations = useMemo(() => {
    // סינון: הצג רק הזמנות עתידיות או נוכחיות (לא עברו)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let filtered = reservations.filter((reservation) => {
      if (!reservation.checkOut) return true // אם אין תאריך יציאה, הצג
      const checkOutDate = new Date(reservation.checkOut)
      if (Number.isNaN(checkOutDate.getTime())) return true
      return checkOutDate >= today // הצג רק אם תאריך היציאה היום או בעתיד
    })
    
    // סינון לפי חודש
    if (selectedMonth !== 'all') {
      const [year, month] = selectedMonth.split('-').map(Number)
      filtered = filtered.filter((reservation) => {
        if (!reservation.checkIn) return false
        const checkInDate = new Date(reservation.checkIn)
        if (Number.isNaN(checkInDate.getTime())) return false
        return checkInDate.getFullYear() === year && checkInDate.getMonth() + 1 === month
      })
    }
    
    // מיון לפי תאריך
    const sorted = [...filtered].sort((a, b) => {
      const dateA = new Date(a.checkIn || 0).getTime()
      const dateB = new Date(b.checkIn || 0).getTime()
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
    })
    
    return sorted
  }, [reservations, selectedMonth, sortOrder])

  const stats = useMemo(() => {
    let totalRevenue = 0
    let totalCommission = 0

    reservations.forEach((reservation) => {
      totalRevenue += reservation.total
      
      // חישוב עמלה לפי מקור ההזמנה מההגדרות הדינמיות
      const source = reservation.source?.toLowerCase() || ''
      let commissionRate = 0
      
      // חיפוש העמלה המתאימה בהגדרות
      if (source.includes('booking') && commissionRates.booking) {
        commissionRate = commissionRates.booking
      } else if (source.includes('airbnb') && commissionRates.airbnb) {
        commissionRate = commissionRates.airbnb
      } else if (source.includes('direct') && commissionRates.direct) {
        commissionRate = commissionRates.direct
      }
      
      totalCommission += reservation.total * commissionRate
    })

    const netRevenue = totalRevenue - totalCommission
    const confirmedCount = reservations.filter((reservation) => reservation.status === 'confirmed').length
    const upcomingCount = reservations.filter((reservation) => {
      const checkIn = new Date(reservation.checkIn)
      if (Number.isNaN(checkIn.getTime())) {
        return false
      }
      return checkIn >= new Date()
    }).length

    return {
      totalRevenue,
      totalCommission,
      netRevenue,
      confirmedCount,
      upcomingCount,
    }
  }, [reservations, commissionRates])

  const monthRange = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return {
      monthStart,
      monthEnd,
      startKey: toLocalKey(monthStart),
      endKey: toLocalKey(monthEnd),
      daysInMonth: monthEnd.getDate(),
      label: new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(monthStart),
    }
  }, [])

  const priceSummary = useMemo(() => {
    if (!roomPrices.length) {
      return null
    }

    const monthPrices = roomPrices.filter((entry) => entry.date >= monthRange.startKey && entry.date <= monthRange.endKey)
    if (!monthPrices.length) {
      return null
    }

    const prices = monthPrices.map((entry) => entry.price).filter((value) => Number.isFinite(value))
    if (!prices.length) {
      return null
    }

    const total = prices.reduce((sum, value) => sum + value, 0)
    const roomsCount = new Set(monthPrices.map((entry) => entry.roomId ?? 'unknown')).size
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const avgPrice = total / prices.length

    return {
      roomsCount,
      minPrice,
      maxPrice,
      avgPrice,
      monthLabel: monthRange.label,
      monthRange: `${monthRange.startKey} - ${monthRange.endKey}`,
    }
  }, [roomPrices, monthRange])

  const bookingSummary = useMemo(() => {
    if (!reservations.length) {
      return null
    }

    const bookedDates = new Set<string>()
    let monthRevenue = 0
    let monthCommission = 0

    reservations.forEach((reservation) => {
      if (!reservation.checkIn || !reservation.checkOut) {
        return
      }
      const checkIn = normalizeDate(new Date(reservation.checkIn))
      const checkOut = normalizeDate(new Date(reservation.checkOut))
      if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
        return
      }
      const checkInKey = toLocalKey(checkIn)
      if (checkInKey >= monthRange.startKey && checkInKey <= monthRange.endKey) {
        monthRevenue += reservation.total
        
        // חישוב עמלה לפי מקור ההזמנה מההגדרות הדינמיות
        const source = reservation.source?.toLowerCase() || ''
        let commissionRate = 0
        
        // חיפוש העמלה המתאימה בהגדרות
        if (source.includes('booking') && commissionRates.booking) {
          commissionRate = commissionRates.booking
        } else if (source.includes('airbnb') && commissionRates.airbnb) {
          commissionRate = commissionRates.airbnb
        } else if (source.includes('direct') && commissionRates.direct) {
          commissionRate = commissionRates.direct
        }
        
        monthCommission += reservation.total * commissionRate
      }

      let cursor = checkIn
      while (cursor < checkOut) {
        const key = toLocalKey(cursor)
        if (key >= monthRange.startKey && key <= monthRange.endKey) {
          bookedDates.add(key)
        }
        cursor = addDays(cursor, 1)
      }
    })

    const bookedDays = bookedDates.size
    const availableDays = Math.max(0, monthRange.daysInMonth - bookedDays)
    const netRevenue = monthRevenue - monthCommission

    return {
      bookedDays,
      availableDays,
      monthRevenue,
      monthCommission,
      netRevenue,
    }
  }, [reservations, monthRange, commissionRates])

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div 
        style={{ 
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="text-center text-white">
          <div className="spinner-border mb-3" role="status">
            <span className="visually-hidden">טוען...</span>
          </div>
          <p>טוען נתונים...</p>
        </div>
      </div>
    )
  }

  // Don't render dashboard if not authenticated (will redirect via useEffect)
  if (status === 'unauthenticated') {
    return null
  }

  return (
    <main 
      style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      }} 
      dir="rtl"
    >
      <div className="container py-3 py-md-5">
        <div className="mb-3 mb-md-4">
          <DashboardHeader 
            session={session} 
            showLandingPageButton={true}
            currentPage="dashboard"
          />
        </div>

        {/* Demo Mode Banner */}
        {meta.isMock && session?.user?.isDemo ? (
          <div 
            className="alert mb-4 d-flex align-items-center justify-content-between"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, rgba(255, 152, 0, 0.15) 100%)',
              border: '2px solid #ffc107',
              borderRadius: '12px',
              padding: '1rem 1.5rem',
            }}
            role="alert"
          >
            <div className="d-flex align-items-center gap-3">
              <span style={{ fontSize: '2rem' }}>🎭</span>
              <div>
                <h5 className="mb-1 fw-bold" style={{ color: '#ff8f00' }}>
                  מצב דמו (Demo Mode)
                </h5>
                <p className="mb-0" style={{ color: '#666', fontSize: '0.9rem' }}>
                  אתה רואה נתונים מדומים לצורך הדגמה. הנתונים אינם אמיתיים ולא נשמרים.
                </p>
              </div>
            </div>
            <div className="badge" style={{
              background: 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)',
              color: 'white',
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              fontWeight: '600',
            }}>
              40 הזמנות מדומות
            </div>
          </div>
        ) : null}

        {reservationsError ? (
          <div className="alert alert-danger" role="alert">
            {reservationsError}
          </div>
        ) : null}

        <div className="row g-3 mb-4">
          <div className="col-4 col-md-4">
            <StatCard 
              title="שנה נוכחית" 
              value={new Date().getFullYear().toString()} 
              helper="נתוני ההזמנות בשנה זו"
            />
          </div>
          <div className="col-4 col-md-4">
            <StatCard 
              title="הכנסות ברוטו" 
              value={formatCurrency(stats.totalRevenue)} 
              helper="סה״כ כל ההזמנות בשנה" 
            />
          </div>
          <div className="col-4 col-md-4">
            <StatCard 
              title="תשלום צפוי" 
              value={formatCurrency(stats.netRevenue)} 
              helper="סה״כ כל ההזמנות בשנה (אחרי עמלות)" 
            />
          </div>
        </div>

        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
          <div 
            className="card-body"
            style={{
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(249, 147, 251, 0.05) 100%)',
            }}
          >
            {/* Mobile: Title + New Reservation Button */}
            <div className="d-flex d-md-none align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center gap-2">
                <h2 
                  className="h5 fw-bold mb-0"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  הזמנות
                </h2>
                {loadingReservations && reservations.length ? (
                  <span className="text-muted small">מרענן...</span>
                ) : null}
              </div>
              <button
                type="button"
                className="btn btn-sm d-flex align-items-center justify-content-center"
                style={{ 
                  background: showNewReservation 
                    ? '#dc3545' 
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  height: '31px',
                  lineHeight: '1.5',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(102, 126, 234, 0.3)'
                }}
                onClick={() => setShowNewReservation((prev) => !prev)}
              >
                {showNewReservation ? 'סגור טופס' : 'הזמנה חדשה'}
              </button>
            </div>

            {/* Mobile: Filter Controls */}
            <div className="d-flex d-md-none align-items-center justify-content-center gap-1 mb-3">
              <select
                className="form-select form-select-sm"
                style={{
                  width: 'auto',
                  minWidth: '95px',
                  maxWidth: '140px',
                  height: '31px',
                  border: '1px solid #667eea',
                  color: '#667eea',
                  padding: '0.25rem 2rem 0.25rem 0.5rem',
                  fontSize: '0.875rem',
                  direction: 'rtl',
                }}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="all">כל החודשים</option>
                {availableMonths.map((monthKey) => {
                  const [year, month] = monthKey.split('-')
                  const monthName = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(
                    new Date(parseInt(year), parseInt(month) - 1)
                  )
                  return (
                    <option key={monthKey} value={monthKey}>
                      {monthName}
                    </option>
                  )
                })}
              </select>
              <select
                className="form-select form-select-sm"
                style={{
                  width: 'auto',
                  minWidth: '95px',
                  maxWidth: '140px',
                  height: '31px',
                  border: '1px solid #764ba2',
                  color: '#764ba2',
                  padding: '0.25rem 2rem 0.25rem 0.5rem',
                  fontSize: '0.875rem',
                  direction: 'rtl',
                }}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              >
                <option value="oldest">קרובות תחילה</option>
                <option value="newest">רחוקות תחילה</option>
              </select>
            </div>

            {/* Desktop: Title + All Controls */}
            <div className="d-none d-md-flex align-items-center justify-content-between mb-3 gap-3">
              <div className="d-flex align-items-center gap-2">
                <h2 
                  className="h5 fw-bold mb-0"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  הזמנות
                </h2>
                {loadingReservations && reservations.length ? (
                  <span className="text-muted small">מרענן...</span>
                ) : null}
              </div>
              <div className="d-flex align-items-center justify-content-center gap-1 gap-md-2">
                <select
                  className="form-select form-select-sm"
                  style={{
                    width: 'auto',
                    minWidth: '95px',
                    maxWidth: '140px',
                    height: '31px',
                    border: '1px solid #667eea',
                    color: '#667eea',
                    padding: '0.25rem 2rem 0.25rem 0.5rem',
                    fontSize: '0.875rem',
                    direction: 'rtl',
                  }}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  <option value="all">כל החודשים</option>
                  {availableMonths.map((monthKey) => {
                    const [year, month] = monthKey.split('-')
                    const monthName = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(
                      new Date(parseInt(year), parseInt(month) - 1)
                    )
                    return (
                      <option key={monthKey} value={monthKey}>
                        {monthName}
                      </option>
                    )
                  })}
                </select>
                <select
                  className="form-select form-select-sm"
                  style={{
                    width: 'auto',
                    minWidth: '95px',
                    maxWidth: '140px',
                    height: '31px',
                    border: '1px solid #764ba2',
                    color: '#764ba2',
                    padding: '0.25rem 2rem 0.25rem 0.5rem',
                    fontSize: '0.875rem',
                    direction: 'rtl',
                  }}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                >
                  <option value="oldest">קרובות תחילה</option>
                  <option value="newest">רחוקות תחילה</option>
                </select>
                <button
                  type="button"
                  className="btn btn-sm d-flex align-items-center justify-content-center"
                  style={{ 
                    background: showNewReservation 
                      ? '#dc3545' 
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    height: '31px',
                    lineHeight: '1.5',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    flex: '1 0 auto',
                    minWidth: '110px',
                    boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(102, 126, 234, 0.3)'
                  }}
                  onClick={() => setShowNewReservation((prev) => !prev)}
                >
                  {showNewReservation ? 'סגור טופס' : 'הזמנה חדשה'}
                </button>
                {meta.isMock && session?.user?.isDemo && (
                  <button
                    type="button"
                    className="btn btn-sm d-flex align-items-center justify-content-center"
                    style={{ 
                      backgroundColor: 'transparent',
                      border: '1px solid #dc3545',
                      color: '#dc3545',
                      padding: '0.25rem 0.5rem',
                      height: '31px',
                      lineHeight: '1.5',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      flex: '1 0 auto',
                      minWidth: '80px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#dc3545'
                      e.currentTarget.style.color = 'white'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = '#dc3545'
                    }}
                    onClick={() => {
                      if (confirm('האם למחוק את כל ההזמנות החדשות שהוספת? (הזמנות המקוריות של הדמו לא ימחקו)')) {
                        clearDemoReservations()
                        refreshReservations()
                      }
                    }}
                    title="מחיקת כל ההזמנות החדשות שהוספת במצב דמו"
                  >
                    🗑️ איפוס
                  </button>
                )}
              </div>
            </div>
            {showNewReservation ? (
              <form
                className="border rounded-3 p-3 mb-3 bg-white"
                onSubmit={(event) => event.preventDefault()}
              >
                <div className="row g-2">
                  <div className="col-12 col-md-6">
                    <label className="form-label small fw-semibold">
                      שם אורח <span className="text-danger">*</span>
                    </label>
                    <div className="row g-2">
                      <div className="col-12 col-sm-6">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="שם פרטי"
                          value={newReservation.firstName}
                          onChange={(event) => updateReservationField('firstName', event.target.value)}
                          required
                        />
                      </div>
                      <div className="col-12 col-sm-6">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="שם משפחה"
                          value={newReservation.lastName}
                          onChange={(event) => updateReservationField('lastName', event.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label small fw-semibold">
                      טלפון / אימייל <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="טלפון או אימייל"
                      value={newReservation.contact}
                      onChange={(event) => updateReservationField('contact', event.target.value)}
                      required
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label small fw-semibold">
                      תאריך כניסה <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={newReservation.arrival}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(event) => updateReservationField('arrival', event.target.value)}
                      required
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label small fw-semibold">
                      תאריך יציאה <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={newReservation.departure}
                      min={newReservation.arrival ? new Date(new Date(newReservation.arrival).getTime() + 86400000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                      onChange={(event) => updateReservationField('departure', event.target.value)}
                      required
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label small fw-semibold">
                      מספר אורחים <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      className="form-control"
                      value={newReservation.guests}
                      onChange={(event) => updateReservationField('guests', Number(event.target.value))}
                      required
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label small fw-semibold">
                      סה״כ לתשלום <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="form-control"
                      placeholder="₪"
                      value={newReservation.total}
                      onChange={(event) => updateReservationField('total', event.target.value)}
                      required
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold">הערות</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="פרטים נוספים"
                      value={newReservation.notes}
                      onChange={(event) => updateReservationField('notes', event.target.value)}
                    ></textarea>
                  </div>
                  <div className="col-12">
                    <div className="form-check d-flex align-items-center" dir="rtl">
                      <input
                        className="form-check-input ms-0 me-2"
                        type="checkbox"
                        id="sendWhatsAppCheckbox"
                        checked={sendWhatsApp}
                        onChange={(e) => setSendWhatsApp(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <label 
                        className="form-check-label small mb-0" 
                        htmlFor="sendWhatsAppCheckbox"
                        style={{ cursor: 'pointer' }}
                      >
                        שלח הודעת WhatsApp לאורח ולבעל הנכס על ההזמנה החדשה
                      </label>
                    </div>
                  </div>
                  {saveReservationError ? (
                    <div className="col-12">
                      <div className="alert alert-danger py-2 mb-0" role="alert">
                        {saveReservationError}
                      </div>
                    </div>
                  ) : null}
                  {saveReservationSuccess ? (
                    <div className="col-12">
                      <div className="alert alert-success py-2 mb-0" role="alert">
                        {saveReservationSuccess}
                      </div>
                    </div>
                  ) : null}
                  <div className="col-12 d-flex flex-column flex-sm-row gap-2">
                    <button 
                      type="button" 
                      className="btn"
                      style={{ 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        color: 'white',
                      }}
                      onClick={handleCreateReservation} 
                      disabled={savingReservation}
                    >
                      {savingReservation ? 'שומר הזמנה...' : 'שמירת הזמנה'}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        border: '1px solid #cbd5e1',
                        color: '#64748b',
                        backgroundColor: 'transparent',
                      }}
                      onClick={() => {
                        setShowNewReservation(false)
                        resetReservationForm()
                      }}
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              </form>
            ) : null}
            {loadingReservations && !reservations.length ? (
              <div className="text-muted">טוען נתונים...</div>
            ) : filteredReservations.length > 0 ? (
              <>
                <ReservationsTable 
                  reservations={filteredReservations} 
                  onReservationViewed={markReservationAsViewed}
                />
                <div className="text-center mt-4 pt-3" style={{ borderTop: '1px solid rgba(102, 126, 234, 0.15)' }}>
                  <Link href="/dashboard/reservations">
                    <button
                      type="button"
                      className="btn btn-lg"
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.75rem 2rem',
                        fontWeight: '500',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      📊 צפייה בכל ההזמנות + סטטיסטיקות מתקדמות
                    </button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-muted text-center py-4">
                {selectedMonth === 'all' ? 'אין הזמנות להצגה' : 'אין הזמנות בחודש זה'}
              </div>
            )}
          </div>
        </div>

        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
          <div 
            className="card-body"
            style={{
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(249, 147, 251, 0.05) 100%)',
            }}
          >
            <div className="mb-3">
              <h2 
                className="h5 fw-bold mb-0"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #f093fb 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                לוח שנה ותמחור
              </h2>
            </div>
            {roomPricesError ? (
              <div className="alert alert-warning mb-3" role="alert">
                {roomPricesError}
              </div>
            ) : null}
            {loadingRoomPrices ? (
              <div className="text-muted">טוען מחירי לילה...</div>
            ) : (
              <CalendarPricing reservations={reservations} prices={roomPrices} onPricesUpdated={refreshRoomPrices} />
            )}
          </div>
        </div>

        <div className="card border-0 shadow-sm" style={{ borderRadius: '12px', background: 'transparent' }}>
          <div className="card-body">
            {loadingRoomPrices ? (
              <div className="text-muted">טוען נתונים...</div>
            ) : priceSummary ? (
              <div className="row g-3">
                <div className="col-4 col-md-4">
                  <StatCard title="חודש" value={priceSummary.monthLabel} helper={priceSummary.monthRange} />
                </div>
                <div className="col-4 col-md-4">
                  <StatCard
                    title="סה״כ הכנסה"
                    value={formatCurrency(bookingSummary?.monthRevenue ?? 0)}
                    helper="הזמנות בחודש הנוכחי"
                  />
                </div>
                <div className="col-4 col-md-4">
                  <StatCard 
                    title="הכנסות נטו" 
                    value={formatCurrency(stats.netRevenue)} 
                    helper="אחרי ניכוי עמלות"
                  />
                </div>
                <div className="col-4 col-md-4">
                  <StatCard title="ימים פנויים" value={`${bookingSummary?.availableDays ?? 0}`} helper="ללא הזמנה" />
                </div>
                <div className="col-4 col-md-4">
                  <StatCard title="מחיר מינימום" value={formatCurrency(priceSummary.minPrice)} />
                </div>
                <div className="col-4 col-md-4">
                  <StatCard 
                    title="הכנסות חודשיות" 
                    value={formatCurrency(bookingSummary?.monthRevenue ?? 0)} 
                    helper="סה״כ החודש"
                  />
                </div>
                <div className="col-4 col-md-4">
                  <StatCard title="מחיר מקסימום" value={formatCurrency(priceSummary.maxPrice)} />
                </div>
              </div>
            ) : (
              <div className="text-muted">אין מחירים להצגה.</div>
            )}
          </div>
        </div>

      </div>
    </main>
  )
}

export default DashboardClient
