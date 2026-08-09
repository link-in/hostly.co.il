'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast, Toaster } from 'sonner'
import type { Reservation, RoomPrice } from '@/lib/dashboard/types'
import { formatCurrency } from '@/lib/dashboard/utils'
import { getDashboardProvider } from '@/lib/dashboard/getDashboardProvider'
import ReservationsTable from './components/ReservationsTable'
import StatCard from './components/StatCard'
import CalendarPricing from './components/CalendarPricing'
import RoomTabs from './components/RoomTabs'
import DashboardHeader from '@/components/DashboardHeader'
import DashboardLoader from '@/components/DashboardLoader'
import { useSelectedRoom } from '@/lib/rooms/RoomContext'
import { Trash2, Plus, X } from 'lucide-react'

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

/** Matte toolbar controls for the dark reservations card. */
const glassControlBase: React.CSSProperties = {
  height: '34px',
  borderRadius: '10px',
  fontSize: '0.8rem',
  fontWeight: 400,
  letterSpacing: '0.01em',
  lineHeight: 1.2,
  direction: 'rtl',
  transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
}

const glassSelectChevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16'%3E%3Cpath fill='rgba(255,255,255,0.55)' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E\")"

const glassSelectStyle: React.CSSProperties = {
  ...glassControlBase,
  width: 'auto',
  minWidth: '118px',
  maxWidth: '168px',
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  backgroundColor: 'rgba(255, 255, 255, 0.06)',
  backgroundImage: glassSelectChevron,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'left 0.65rem center',
  backgroundSize: '11px',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  color: 'rgba(255, 255, 255, 0.82)',
  padding: '0.3rem 0.75rem 0.3rem 1.85rem',
  boxShadow: 'none',
  cursor: 'pointer',
}

const glassCtaStyle = (closing: boolean): React.CSSProperties => ({
  ...glassControlBase,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.3rem',
  border: closing
    ? '1px solid rgba(248, 113, 113, 0.35)'
    : '1px solid rgba(147, 163, 240, 0.35)',
  background: closing
    ? 'rgba(239, 68, 68, 0.14)'
    : 'rgba(102, 126, 234, 0.22)',
  color: closing ? 'rgba(254, 202, 202, 0.95)' : 'rgba(226, 232, 255, 0.95)',
  padding: '0.3rem 0.9rem',
  fontWeight: 500,
  whiteSpace: 'nowrap',
  minWidth: '112px',
  boxShadow: 'none',
  cursor: 'pointer',
})

const DashboardClient = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { selectedRoomId } = useSelectedRoom()
  
  // Recreate provider when selected room changes so prices/bookings are room-scoped
  const { provider, meta } = useMemo(
    () => getDashboardProvider(session?.user, selectedRoomId || session?.user?.roomId),
    [session?.user, selectedRoomId]
  )
  
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [roomPrices, setRoomPrices] = useState<RoomPrice[]>([])
  const [loadingReservations, setLoadingReservations] = useState(true)
  const [loadingRoomPrices, setLoadingRoomPrices] = useState(true)
  const [initialRoomPricesLoaded, setInitialRoomPricesLoaded] = useState(false)
  const [reservationsError, setReservationsError] = useState<string | null>(null)
  const [roomPricesError, setRoomPricesError] = useState<string | null>(null)
  const [showNewReservation, setShowNewReservation] = useState(false)
  const [savingReservation, setSavingReservation] = useState(false)
  const [saveReservationError, setSaveReservationError] = useState<string | null>(null)
  const [saveReservationSuccess, setSaveReservationSuccess] = useState<string | null>(null)
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [newReservation, setNewReservation] = useState({
    firstName: '',
    lastName: '',
    contact: '',
    email: '',
    arrival: '',
    departure: '',
    adults: 2,
    children: 0,
    total: '',
    notes: '',
  })
  const [sendWhatsApp, setSendWhatsApp] = useState(true) // Default: send WhatsApp
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('oldest') // מיון לפי הקרוב ביותר
  const [showMobileFilters, setShowMobileFilters] = useState(false) // Mobile filter menu state
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
      email: '',
      arrival: '',
      departure: '',
      adults: 2,
      children: 0,
      total: '',
      notes: '',
    })
    setSendWhatsApp(true) // Reset to default: send WhatsApp
    setIsEditing(false)
    setEditingReservation(null)
  }

  const startEditReservation = (reservation: Reservation) => {
    // Only allow editing Direct bookings (created in our system)
    if (!reservation.source || !reservation.source.toLowerCase().includes('direct')) {
      toast.warning('ניתן לערוך רק הזמנות שנוצרו ישירות במערכת', {
        duration: 3000,
      })
      return
    }

    // Parse guest name
    const [firstName = '', ...lastNameParts] = (reservation.guestName || '').split(' ')
    const lastName = lastNameParts.join(' ')

    setEditingReservation(reservation)
    setIsEditing(true)
    setNewReservation({
      firstName,
      lastName,
      contact: reservation.phone || '',
      email: reservation.email || '',
      arrival: reservation.checkIn,
      departure: reservation.checkOut,
      adults: reservation.adults || 2,
      children: reservation.children || 0,
      total: String(reservation.total),
      notes: reservation.notes || '',
    })
    setShowNewReservation(true)
    setSaveReservationError(null)
    setSaveReservationSuccess(null)
  }

  const refreshRoomPrices = async () => {
    // Only show full loading spinner on first load — subsequent refreshes update silently
    // so CalendarPricing stays mounted and preserves local state (priceOverrides etc.)
    if (!initialRoomPricesLoaded) {
      setLoadingRoomPrices(true)
    }
    try {
      const prices = await provider.getRoomPrices()
      setRoomPrices(prices)
      setRoomPricesError(null)
    } catch (error) {
      setRoomPricesError(error instanceof Error ? error.message : 'טעינת מחירי לילה נכשלה')
    } finally {
      setLoadingRoomPrices(false)
      setInitialRoomPricesLoaded(true)
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
      setSaveReservationError('יש להזין מספר טלפון.')
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
    const conflictingReservations: Reservation[] = []
    const hasConflict = reservations.some((reservation) => {
      if (reservation.status === 'cancelled' || !reservation.checkIn || !reservation.checkOut) {
        return false
      }
      const checkIn = normalizeDate(new Date(reservation.checkIn))
      const checkOut = normalizeDate(new Date(reservation.checkOut))
      if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
        return false
      }
      // A room is occupied from checkin (inclusive) to checkout (exclusive)
      // So checkout day is available for next checkin
      // Conflict exists if: newArrival < existingCheckout AND newDeparture > existingCheckin
      // BUT we need to allow: existingCheckout === newArrival (same day checkout/checkin)
      const hasOverlap = arrivalDate < checkOut && departureDate > checkIn
      
      // Allow same-day checkout/checkin (checkout at 12pm, checkin at 2pm)
      const isSameDayTurnover = arrivalDate.getTime() === checkOut.getTime() || departureDate.getTime() === checkIn.getTime()
      
      const isConflict = hasOverlap && !isSameDayTurnover
      
      if (isConflict) {
        conflictingReservations.push(reservation)
      }
      
      return isConflict
    })
    if (hasConflict) {
      const conflictDetails = conflictingReservations
        .map((r) => `${r.guestName || 'אורח'} (${new Date(r.checkIn!).toLocaleDateString('he-IL')} - ${new Date(r.checkOut!).toLocaleDateString('he-IL')})`)
        .join(', ')
      setSaveReservationError(`קיימת הזמנה בתאריכים שנבחרו: ${conflictDetails}`)
      return
    }
    if (!newReservation.total) {
      setSaveReservationError('יש להזין סכום לתשלום.')
      return
    }

    // Contact is always phone, email is optional separate field
    const phone = newReservation.contact.trim()
    const email = newReservation.email.trim()
    
    const payload = [
      {
        arrival: newReservation.arrival,
        departure: newReservation.departure,
        firstName: newReservation.firstName.trim(),
        lastName: newReservation.lastName.trim(),
        status: 'confirmed',
        notes: newReservation.notes.trim() || undefined,
        numAdult: newReservation.adults || 1,
        numChild: newReservation.children || 0,
        mobile: phone, // Phone is required
        ...(email ? { email } : {}), // Email is optional
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
          sendWhatsApp: sendWhatsApp,
          roomId: selectedRoomId || undefined,
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
          adults: newReservation.adults,
          children: newReservation.children,
          guests: (newReservation.adults || 0) + (newReservation.children || 0),
          total: Number(newReservation.total),
          status: 'confirmed',
          source: 'Demo (הזמנה ידנית)',
          phone,
          email: email || undefined,
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

  const handleUpdateReservation = async () => {
    if (savingReservation || !editingReservation) {
      return
    }

    setSavingReservation(true)
    setSaveReservationError(null)
    setSaveReservationSuccess(null)

    if (!newReservation.firstName.trim() || !newReservation.lastName.trim()) {
      setSaveReservationError('יש להזין שם מלא.')
      setSavingReservation(false)
      return
    }
    if (!newReservation.contact.trim()) {
      setSaveReservationError('יש להזין מספר טלפון.')
      setSavingReservation(false)
      return
    }
    if (!newReservation.arrival || !newReservation.departure) {
      setSaveReservationError('יש לבחור תאריכי כניסה ויציאה.')
      setSavingReservation(false)
      return
    }
    const arrivalDate = normalizeDate(new Date(newReservation.arrival))
    const departureDate = normalizeDate(new Date(newReservation.departure))
    if (Number.isNaN(arrivalDate.getTime()) || Number.isNaN(departureDate.getTime())) {
      setSaveReservationError('תאריכים לא תקינים.')
      setSavingReservation(false)
      return
    }
    if (departureDate <= arrivalDate) {
      setSaveReservationError('תאריך היציאה חייב להיות אחרי תאריך הכניסה.')
      setSavingReservation(false)
      return
    }

    // Check conflicts (excluding the current reservation being edited)
    const conflictingReservations: Reservation[] = []
    const hasConflict = reservations.some((reservation) => {
      // Skip the current reservation being edited
      if (reservation.id === editingReservation.id) {
        return false
      }
      
      if (reservation.status === 'cancelled' || !reservation.checkIn || !reservation.checkOut) {
        return false
      }
      const checkIn = normalizeDate(new Date(reservation.checkIn))
      const checkOut = normalizeDate(new Date(reservation.checkOut))
      if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
        return false
      }
      
      const hasOverlap = arrivalDate < checkOut && departureDate > checkIn
      const isSameDayTurnover = arrivalDate.getTime() === checkOut.getTime() || departureDate.getTime() === checkIn.getTime()
      const isConflict = hasOverlap && !isSameDayTurnover
      
      if (isConflict) {
        conflictingReservations.push(reservation)
      }
      
      return isConflict
    })

    if (hasConflict) {
      const conflictDetails = conflictingReservations
        .map((r) => `${r.guestName || 'אורח'} (${new Date(r.checkIn!).toLocaleDateString('he-IL')} - ${new Date(r.checkOut!).toLocaleDateString('he-IL')})`)
        .join(', ')
      setSaveReservationError(`קיימת הזמנה בתאריכים שנבחרו: ${conflictDetails}`)
      setSavingReservation(false)
      return
    }

    if (!newReservation.total) {
      setSaveReservationError('יש להזין סכום לתשלום.')
      setSavingReservation(false)
      return
    }

    const phone = newReservation.contact.trim()
    const email = newReservation.email.trim()
    
    const payload = {
      bookingId: editingReservation.id,
      propertyId: editingReservation.propertyId, // Required by Beds24 for updates
      roomId: editingReservation.roomId, // Required by Beds24 for updates
      arrival: newReservation.arrival,
      departure: newReservation.departure,
      firstName: newReservation.firstName.trim(),
      lastName: newReservation.lastName.trim(),
      notes: newReservation.notes.trim() || undefined,
      numAdult: newReservation.adults || 1,
      numChild: newReservation.children || 0,
      mobile: phone,
      ...(email ? { email } : {}),
      price: Number(newReservation.total),
    }

    try {
      const response = await fetch('/api/dashboard/bookings', {
        method: 'PATCH', // PATCH to our API (which will POST to Beds24 internally)
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('עדכון ההזמנה נכשל')
      }

      const result = await response.json()
      
      if (result.demo) {
        // Update demo reservation in session storage
        const demoReservations = loadDemoReservations()
        const updated = demoReservations.map(r => 
          r.id === editingReservation.id 
            ? {
                ...r,
                guestName: `${newReservation.firstName} ${newReservation.lastName}`,
                checkIn: newReservation.arrival,
                checkOut: newReservation.departure,
                adults: newReservation.adults,
                children: newReservation.children,
                guests: (newReservation.adults || 0) + (newReservation.children || 0),
                total: Number(newReservation.total),
                phone,
                email: email || undefined,
                notes: newReservation.notes.trim() || undefined,
              }
            : r
        )
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(DEMO_RESERVATIONS_KEY, JSON.stringify(updated))
        }
        setSaveReservationSuccess('🎭 מצב דמו: ההזמנה עודכנה בהצלחה!')
      } else {
        setSaveReservationSuccess('ההזמנה עודכנה בהצלחה.')
      }
      
      await refreshReservations()
      resetReservationForm()
      setShowNewReservation(false)
    } catch (error) {
      setSaveReservationError(error instanceof Error ? error.message : 'עדכון ההזמנה נכשל')
    } finally {
      setSavingReservation(false)
    }
  }

  /**
   * Cancel a Direct booking in Beds24 (sets status to 0/cancelled)
   * Only allows cancelling bookings created directly in our system
   */
  const handleDeleteReservation = async (reservation: Reservation) => {
    // Validate it's a Direct booking
    if (!reservation.source || !reservation.source.toLowerCase().includes('direct')) {
      toast.warning('ניתן לבטל רק הזמנות שנוצרו ישירות במערכת', {
        duration: 3000,
      })
      return
    }

    // Check if already cancelled
    if (reservation.status === 'cancelled') {
      toast.info('ההזמנה כבר מבוטלת', {
        duration: 2500,
      })
      return
    }

    // Show elegant confirmation toast with action buttons
    const guestName = reservation.guestName || 'אורח'
    const checkInDate = new Date(reservation.checkIn).toLocaleDateString('he-IL')
    const checkOutDate = new Date(reservation.checkOut).toLocaleDateString('he-IL')
    
    toast.warning(
      `בטל הזמנה של ${guestName}?`,
      {
        description: `${checkInDate} - ${checkOutDate}`,
        duration: 10000,
        action: {
          label: '✓ אישור',
          onClick: () => performCancellation(reservation),
        },
        cancel: {
          label: '✕ ביטול',
          onClick: () => {},
        },
      }
    )
  }

  /**
   * Perform the actual cancellation after confirmation
   */
  const performCancellation = async (reservation: Reservation) => {
    try {
      // Get propertyId and roomId from session
      const propertyId = session?.user?.propertyId
      const roomId = session?.user?.roomId
      
      console.log('🔍 Cancelling reservation:', {
        bookingId: reservation.id,
        currentStatus: reservation.status,
        propertyId,
        roomId,
        source: reservation.source,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
      })
      
      if (!propertyId || !roomId) {
        console.error('❌ Missing propertyId or roomId:', { propertyId, roomId })
        throw new Error('חסרים נתוני נכס/חדר - אנא התחבר מחדש')
      }
      
      const response = await fetch('/api/dashboard/bookings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: reservation.id,
          source: reservation.source,
          propertyId,
          roomId,
          arrival: reservation.checkIn,
          departure: reservation.checkOut,
          guestName: reservation.guestName,
          guestPhone: reservation.phone,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'ביטול ההזמנה נכשל')
      }

      const result = await response.json()
      
      if (result.demo) {
        // Delete from demo storage
        const demoReservations = loadDemoReservations()
        const updated = demoReservations.filter(r => r.id !== reservation.id)
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(DEMO_RESERVATIONS_KEY, JSON.stringify(updated))
        }
        toast.success('🎭 מצב דמו: ההזמנה בוטלה בהצלחה!', {
          duration: 3000,
        })
      } else {
        toast.success('ההזמנה בוטלה בהצלחה', {
          description: 'הסטטוס עודכן ב-Beds24',
          duration: 3000,
        })
      }
      
      // Remove the cancelled reservation from local state immediately
      setReservations(prev => prev.filter(r => r.id !== reservation.id))
      
      // Also refresh from server to ensure sync (cancelled bookings will be filtered out)
      setTimeout(() => refreshReservations(), 1000)
    } catch (error) {
      toast.error('ביטול ההזמנה נכשל', {
        description: error instanceof Error ? error.message : 'שגיאה לא צפויה',
        duration: 4000,
      })
      console.error('Error cancelling reservation:', error)
    }
  }

  // Close mobile filters when clicking outside
  useEffect(() => {
    if (!showMobileFilters) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      // Check if click is outside the filter dropdown and filter button
      if (!target.closest('[data-mobile-filter]') && !target.closest('[aria-label="פילטרים"]')) {
        setShowMobileFilters(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMobileFilters])

  // Check authentication - redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log('🔒 User not authenticated, redirecting to login')
      router.push('/')
    }
  }, [status, router])

  // Redirect new users (no propertyId) to onboarding
  useEffect(() => {
    if (
      status === 'authenticated' &&
      session?.user &&
      !session.user.propertyId &&
      session.user.role !== 'admin' &&
      !session.user.isDemo
    ) {
      // Small delay to allow session update to propagate
      const timer = setTimeout(() => {
        if (!session?.user?.propertyId) {
          router.push('/dashboard/onboarding')
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [status, session, router])

  // Reset loading state whenever the selected room changes so stale data is hidden
  useEffect(() => {
    if (selectedRoomId) {
      setLoadingReservations(true)
      setLoadingRoomPrices(true)
    }
  }, [selectedRoomId])

  useEffect(() => {
    if (status !== 'authenticated') return

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
  }, [provider, status])

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
    // הזמנות מבוטלות כבר מסוננות ב-provider
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
    const today = normalizeDate(new Date())
    const monthStart = normalizeDate(monthRange.monthStart)
    const monthEnd = normalizeDate(monthRange.monthEnd)
    // Mid-month: only remaining nights count as "still available"
    const availableFrom = today > monthStart ? today : monthStart
    const availableFromKey = toLocalKey(availableFrom)

    const bookedDates = new Set<string>()
    const blockedDates = new Set<string>()
    let monthRevenue = 0
    let monthCommission = 0

    roomPrices.forEach((entry) => {
      if (entry.numAvail !== 0) return
      if (entry.date < availableFromKey || entry.date > monthRange.endKey) return
      blockedDates.add(entry.date)
    })

    reservations.forEach((reservation) => {
      if (!reservation.checkIn || !reservation.checkOut) {
        return
      }
      if (reservation.status === 'cancelled') {
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
        if (key >= availableFromKey && key <= monthRange.endKey) {
          bookedDates.add(key)
        }
        cursor = addDays(cursor, 1)
      }
    })

    let availableDays = 0
    for (let cursor = availableFrom; cursor <= monthEnd; cursor = addDays(cursor, 1)) {
      const key = toLocalKey(cursor)
      if (!bookedDates.has(key) && !blockedDates.has(key)) {
        availableDays += 1
      }
    }

    const bookedDays = bookedDates.size
    const netRevenue = monthRevenue - monthCommission

    return {
      bookedDays,
      availableDays,
      monthRevenue,
      monthCommission,
      netRevenue,
    }
  }, [reservations, monthRange, commissionRates, roomPrices])

  // Show loading while checking authentication
  if (status === 'loading') {
    return <DashboardLoader variant="fullscreen" label="טוען את הדשבורד…" />
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

        <RoomTabs />

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

        <div className="card border-0 shadow-lg mb-4 reservations-section" style={{ 
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
        }}>
          <style>{`
            @media (max-width: 768px) {
              .reservations-section {
                background: transparent !important;
                box-shadow: none !important;
                border: none !important;
              }
              .reservations-section .card-body {
                background: transparent !important;
                padding-left: 0 !important;
                padding-right: 0 !important;
              }
            }
            @media (min-width: 769px) {
              .reservations-section {
                background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%) !important;
              }
            }
          `}</style>
          <div 
            className="card-body"
            style={{
              background: 'transparent',
            }}
          >
            {/* Mobile: CTA Bar with Filter Icon, New Reservation, and All Reservations Buttons */}
            <div className="d-flex d-md-none align-items-center justify-content-between mb-3 gap-2" style={{ position: 'relative' }}>
              {/* Filter Icon Button */}
              <button
                type="button"
                className="btn btn-sm d-flex align-items-center justify-content-center"
                style={{ 
                  background: showMobileFilters 
                    ? 'linear-gradient(135deg, #8b9aee 0%, #9b6bba 100%)' 
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  color: 'white',
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  boxShadow: showMobileFilters 
                    ? '0 4px 12px rgba(139, 154, 238, 0.4)' 
                    : '0 2px 8px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
                onClick={() => setShowMobileFilters((prev) => !prev)}
                aria-label="פילטרים"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="18" 
                  height="18" 
                  fill="currentColor" 
                  viewBox="0 0 16 16"
                  style={{ transition: 'transform 0.2s ease', transform: showMobileFilters ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5v-2z"/>
                </svg>
              </button>

              {/* Right Side CTA Buttons */}
              <div className="d-flex align-items-center gap-2" style={{ flex: 1, justifyContent: 'flex-end' }}>
                {/* All Reservations Button */}
                <Link href="/dashboard/reservations" style={{ textDecoration: 'none' }}>
                  <button
                    type="button"
                    className="btn btn-sm d-flex align-items-center justify-content-center gap-1"
                    style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      color: 'white',
                      padding: '0.375rem 0.625rem',
                      height: '36px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #8b9aee 0%, #9b6bba 100%)'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
                    }}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="14" 
                      height="14" 
                      fill="currentColor" 
                      viewBox="0 0 16 16"
                    >
                      <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z"/>
                    </svg>
                    <span>כל ההזמנות</span>
                  </button>
                </Link>

                {/* New Reservation Button - Enhanced CTA */}
                <button
                  type="button"
                  className="hostly-btn hostly-btn-sm hostly-btn-primary"
                  style={{
                    ...glassCtaStyle(showNewReservation),
                    flexShrink: 0,
                    height: '34px',
                    padding: '0.3rem 0.8rem',
                    minWidth: 'auto',
                  }}
                  onMouseEnter={(e) => {
                    if (!showNewReservation) {
                      e.currentTarget.style.background = 'rgba(102, 126, 234, 0.3)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    Object.assign(e.currentTarget.style, {
                      ...glassCtaStyle(showNewReservation),
                      flexShrink: 0,
                      height: '34px',
                      padding: '0.3rem 0.8rem',
                      minWidth: 'auto',
                    })
                  }}
                  onClick={() => setShowNewReservation((prev) => !prev)}
                >
                  {showNewReservation ? (
                    <>
                      <X size={14} />
                      <span>סגור</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>הזמנה חדשה</span>
                    </>
                  )}
                </button>
              </div>

              {/* Mobile Filter Dropdown */}
              {showMobileFilters && (
                <div 
                  data-mobile-filter
                  style={{
                    position: 'absolute',
                    top: '45px',
                    left: '0',
                    right: '0',
                    background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
                    border: '1px solid rgba(249, 147, 251, 0.2)',
                    borderRadius: '12px',
                    padding: '1rem',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                    zIndex: 1000,
                    animation: 'slideDown 0.2s ease',
                  }}
                >
                  <style>{`
                    @keyframes slideDown {
                      from {
                        opacity: 0;
                        transform: translateY(-10px);
                      }
                      to {
                        opacity: 1;
                        transform: translateY(0);
                      }
                    }
                  `}</style>
                  
                  {/* Filter Title */}
                  <div style={{ 
                    marginBottom: '0.75rem', 
                    color: 'rgba(249, 147, 251, 0.9)',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    textAlign: 'right',
                  }}>
                    סינון והצגה
                  </div>

                  {/* Month Filter */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label 
                      htmlFor="mobile-month-filter"
                      style={{ 
                        display: 'block',
                        marginBottom: '0.375rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.75rem',
                        textAlign: 'right',
                      }}
                    >
                      בחירת חודש
                    </label>
                    <select
                      id="mobile-month-filter"
                      className="form-select form-select-sm hostly-glass-select"
                      style={{
                        ...glassSelectStyle,
                        width: '100%',
                        maxWidth: 'none',
                        minWidth: 0,
                      }}
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                      <option value="all" style={{ background: '#1e293b', color: 'white' }}>כל החודשים</option>
                      {availableMonths.map((monthKey) => {
                        const [year, month] = monthKey.split('-')
                        const monthName = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(
                          new Date(parseInt(year), parseInt(month) - 1)
                        )
                        return (
                          <option key={monthKey} value={monthKey} style={{ background: '#1e293b', color: 'white' }}>
                            {monthName}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  {/* Sort Order Filter */}
                  <div>
                    <label 
                      htmlFor="mobile-sort-filter"
                      style={{ 
                        display: 'block',
                        marginBottom: '0.375rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.75rem',
                        textAlign: 'right',
                      }}
                    >
                      סדר תצוגה
                    </label>
                    <select
                      id="mobile-sort-filter"
                      className="form-select form-select-sm hostly-glass-select"
                      style={{
                        ...glassSelectStyle,
                        width: '100%',
                        maxWidth: 'none',
                        minWidth: 0,
                      }}
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                    >
                      <option value="oldest" style={{ background: '#1e293b', color: 'white' }}>קרובות תחילה</option>
                      <option value="newest" style={{ background: '#1e293b', color: 'white' }}>רחוקות תחילה</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop: Title + All Controls */}
            <div className="d-none d-md-flex align-items-center justify-content-between mb-3 gap-3">
              <style>{`
                .hostly-glass-select.form-select {
                  background-color: rgba(255, 255, 255, 0.06) !important;
                  background-image: ${glassSelectChevron} !important;
                  background-repeat: no-repeat !important;
                  background-position: left 0.65rem center !important;
                  background-size: 11px !important;
                  color: rgba(255, 255, 255, 0.82) !important;
                  border: 1px solid rgba(255, 255, 255, 0.12) !important;
                  box-shadow: none !important;
                  font-weight: 400;
                }
                .hostly-glass-select.form-select:hover,
                .hostly-glass-select.form-select:focus {
                  background-color: rgba(255, 255, 255, 0.09) !important;
                  border-color: rgba(255, 255, 255, 0.2) !important;
                  box-shadow: none !important;
                  outline: none;
                  color: rgba(255, 255, 255, 0.92) !important;
                }
                .hostly-glass-select.form-select option {
                  background: #1e293b;
                  color: #fff;
                }
              `}</style>
              <div className="d-flex align-items-center gap-2">
                <h2 
                  className="h5 fw-bold mb-0"
                  style={{
                    color: 'rgba(249, 147, 251, 0.9)',
                  }}
                >
                  הזמנות
                </h2>
                {loadingReservations && reservations.length ? (
                  <span className="small d-inline-flex align-items-center gap-2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    <DashboardLoader variant="inline" tone="onDark" />
                    מרענן…
                  </span>
                ) : null}
              </div>
              <div className="d-flex align-items-center justify-content-center gap-3">
                <select
                  className="form-select form-select-sm hostly-glass-select"
                  style={glassSelectStyle}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  <option value="all" style={{ background: '#1e293b', color: 'white' }}>כל החודשים</option>
                  {availableMonths.map((monthKey) => {
                    const [year, month] = monthKey.split('-')
                    const monthName = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(
                      new Date(parseInt(year), parseInt(month) - 1)
                    )
                    return (
                      <option key={monthKey} value={monthKey} style={{ background: '#1e293b', color: 'white' }}>
                        {monthName}
                      </option>
                    )
                  })}
                </select>
                <select
                  className="form-select form-select-sm hostly-glass-select"
                  style={glassSelectStyle}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                >
                  <option value="oldest" style={{ background: '#1e293b', color: 'white' }}>קרובות תחילה</option>
                  <option value="newest" style={{ background: '#1e293b', color: 'white' }}>רחוקות תחילה</option>
                </select>
                <button
                  type="button"
                  className="hostly-btn hostly-btn-sm hostly-btn-primary"
                  style={glassCtaStyle(showNewReservation)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = showNewReservation
                      ? 'rgba(239, 68, 68, 0.2)'
                      : 'rgba(102, 126, 234, 0.3)'
                  }}
                  onMouseLeave={(e) => {
                    Object.assign(e.currentTarget.style, glassCtaStyle(showNewReservation))
                  }}
                  onClick={() => setShowNewReservation((prev) => !prev)}
                >
                  {showNewReservation ? (
                    <>
                      <X size={14} />
                      סגור טופס
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      הזמנה חדשה
                    </>
                  )}
                </button>
                {meta.isMock && session?.user?.isDemo && (
                  <button
                    type="button"
                    className="hostly-btn hostly-btn-sm hostly-btn-danger"
                    onClick={() => {
                      toast.warning(
                        'מחק הזמנות דמו?',
                        {
                          description: 'הזמנות המקוריות של הדמו לא ימחקו',
                          duration: 10000,
                          action: {
                            label: '✓ מחק הכל',
                            onClick: () => {
                              clearDemoReservations()
                              refreshReservations()
                              toast.success('הזמנות הדמו נמחקו בהצלחה')
                            },
                          },
                          cancel: {
                            label: '✕ ביטול',
                            onClick: () => {},
                          },
                        }
                      )
                    }}
                    title="מחיקת כל ההזמנות החדשות שהוספת במצב דמו"
                  >
                    <Trash2 size={14} />
                    איפוס
                  </button>
                )}
              </div>
            </div>
            {showNewReservation ? (
              <form
                className="rounded-3 p-3 mb-3 dark-form"
                style={{
                  background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
                  border: '1px solid rgba(249, 147, 251, 0.2)',
                }}
                onSubmit={(event) => event.preventDefault()}
              >
                <style>{`
                  .dark-form label {
                    color: rgba(249, 147, 251, 0.9) !important;
                  }
                  .dark-form .form-control,
                  .dark-form .form-select {
                    background: rgba(0, 0, 0, 0.2) !important;
                    border: 1px solid rgba(249, 147, 251, 0.2) !important;
                    color: white !important;
                  }
                  .dark-form .form-control::placeholder {
                    color: rgba(255, 255, 255, 0.5) !important;
                  }
                  .dark-form .form-control:focus,
                  .dark-form .form-select:focus {
                    background: rgba(0, 0, 0, 0.3) !important;
                    border-color: #f093fb !important;
                    box-shadow: 0 0 0 0.25rem rgba(240, 147, 251, 0.25) !important;
                    color: white !important;
                  }
                  .dark-form .form-check-label {
                    color: rgba(255, 255, 255, 0.9) !important;
                  }
                  .dark-form .form-check-input {
                    background-color: rgba(0, 0, 0, 0.2) !important;
                    border: 1px solid rgba(249, 147, 251, 0.3) !important;
                  }
                  .dark-form .form-check-input:checked {
                    background-color: #f093fb !important;
                    border-color: #f093fb !important;
                  }
                `}</style>
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
                  <div className="col-12 col-md-3">
                    <label className="form-label small fw-semibold">
                      טלפון נייד <span className="text-danger">*</span>
                    </label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="052-1234567"
                      value={newReservation.contact}
                      onChange={(event) => updateReservationField('contact', event.target.value)}
                      pattern="^(0[2-9]\d{7,8}|(\+?972)?[2-9]\d{7,8})$"
                      title="מספר טלפון נייד (לדוגמה: 052-1234567)"
                      required
                    />
                    <small className="text-muted">052-1234567</small>
                  </div>
                  <div className="col-12 col-md-3">
                    <label className="form-label small fw-semibold">
                      אימייל
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="guest@example.com"
                      value={newReservation.email}
                      onChange={(event) => updateReservationField('email', event.target.value)}
                    />
                    <small className="text-muted">אופציונלי</small>
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
                      מבוגרים <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      className="form-control"
                      value={newReservation.adults}
                      onChange={(event) => updateReservationField('adults', Number(event.target.value))}
                      required
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label small fw-semibold">
                      ילדים
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="form-control"
                      value={newReservation.children}
                      onChange={(event) => updateReservationField('children', Number(event.target.value))}
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
                  {!isEditing && (
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
                  )}
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
                      className="hostly-btn hostly-btn-primary"
                      onClick={isEditing ? handleUpdateReservation : handleCreateReservation} 
                      disabled={savingReservation}
                    >
                      {savingReservation 
                        ? (isEditing ? 'מעדכן הזמנה...' : 'שומר הזמנה...') 
                        : (isEditing ? 'עדכן הזמנה' : 'שמירת הזמנה')
                      }
                    </button>
                    <button
                      type="button"
                      className="hostly-btn hostly-btn-ghost"
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
              <DashboardLoader variant="section" tone="onDark" label="טוען הזמנות…" minHeight={220} />
            ) : filteredReservations.length > 0 ? (
                <ReservationsTable 
                  reservations={filteredReservations} 
                  onReservationViewed={markReservationAsViewed}
                  onEditReservation={startEditReservation}
                  onDeleteReservation={handleDeleteReservation}
                />
            ) : (
              <div className="text-center py-4" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                {selectedMonth === 'all' ? 'אין הזמנות להצגה' : 'אין הזמנות בחודש זה'}
              </div>
            )}
          </div>
        </div>

        <div className="card border-0 shadow-lg mb-4" style={{ 
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
        }}>
          <div className="card-body">
            <div className="mb-3">
              <h2 
                className="h5 fw-bold mb-0"
                style={{
                  color: 'rgba(249, 147, 251, 0.9)',
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
            {loadingRoomPrices && !initialRoomPricesLoaded ? (
              <DashboardLoader variant="section" tone="onDark" label="טוען לוח שנה ומחירים…" minHeight={320} />
            ) : (
              <CalendarPricing reservations={reservations} prices={roomPrices} onPricesUpdated={refreshRoomPrices} />
            )}
          </div>
        </div>

        <div className="card border-0 shadow-sm" style={{ 
          borderRadius: '12px', 
          background: 'transparent',
        }}>
          <div className="card-body" style={{ padding: 0 }}>
            {loadingRoomPrices ? (
              <DashboardLoader variant="section" tone="onGradient" label="טוען סיכום…" minHeight={120} />
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
                  <StatCard title="ימים פנויים" value={`${bookingSummary?.availableDays ?? 0}`} helper="מהיום, בלי הזמנה/חסימה" />
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
              <div style={{ color: 'rgba(255, 255, 255, 0.7)' }}>אין מחירים להצגה.</div>
            )}
          </div>
        </div>

      </div>
      <Toaster 
        position="top-center" 
        richColors 
        closeButton 
        dir="rtl"
        toastOptions={{
          style: {
            fontFamily: 'inherit',
          },
        }}
      />
    </main>
  )
}

export default DashboardClient
