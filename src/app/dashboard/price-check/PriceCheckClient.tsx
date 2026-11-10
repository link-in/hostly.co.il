'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast, Toaster } from 'sonner'
import {
  Search,
  Calendar,
  CalendarDays,
  CalendarX2,
  Users,
  Baby,
  Moon,
  Tag,
  Globe,
  CheckCircle2,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react'
import DashboardHeader from '@/components/DashboardHeader'
import DashboardLoader from '@/components/DashboardLoader'
import { PageHeader, NumberStepper } from '@/components/ui'
import RoomTabs from '../components/RoomTabs'
import { useSelectedRoom } from '@/lib/rooms/RoomContext'
import { formatCurrency, formatDate } from '@/lib/dashboard/utils'
import { calculateChannelPrices } from '@/lib/pricing/channelPricing'
import { validatePriceCheckInput } from '@/lib/pricing/priceCheckValidation'
import {
  calculateHostlyPrice,
  calculatePriceMatch,
  buildChannelUrl,
  type OnlineChannelPriceResult,
  type ChannelUrlConfig,
} from '@/lib/pricing/onlinePriceFetcher'
import PriceComparisonTable from './components/PriceComparisonTable'
import ChannelUrlSettings from './components/ChannelUrlSettings'

type PriceCheckResult = {
  available: boolean
  price: number
  currency: string
  nights: number
  pricePerNight: number
  checkIn: string
  checkOut: string
  numAdult: number
  numChild: number
}

const getTodayString = (): string => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

const getTomorrowString = (fromDateStr?: string): string => {
  const base = fromDateStr ? new Date(fromDateStr) : new Date()
  base.setDate(base.getDate() + 1)
  return base.toISOString().split('T')[0]
}

const getStoredChannelUrls = (roomId?: string): ChannelUrlConfig => {
  if (typeof window === 'undefined') return {}
  try {
    const key = `hostly_channel_urls_${roomId || 'default'}`
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {
    // Ignore JSON parse errors
  }
  return {
    airbnb: '',
    booking: '',
    direct: '',
  }
}

const setStoredChannelUrls = (roomId: string | undefined, urls: ChannelUrlConfig) => {
  if (typeof window === 'undefined') return
  try {
    const key = `hostly_channel_urls_${roomId || 'default'}`
    localStorage.setItem(key, JSON.stringify(urls))
  } catch (e) {
    console.error('Failed to save channel URLs to localStorage', e)
  }
}

export default function PriceCheckClient() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedRoomId, setSelectedRoom } = useSelectedRoom()

  const queryCheckIn = searchParams.get('checkIn') || ''
  const queryCheckOut = searchParams.get('checkOut') || ''
  const queryRoom = searchParams.get('room') || ''
  const queryAuto = searchParams.get('auto') === 'true'

  // Form state
  const [checkIn, setCheckIn] = useState<string>(queryCheckIn || '')
  const [checkOut, setCheckOut] = useState<string>(queryCheckOut || '')
  const [numAdult, setNumAdult] = useState<number>(2)
  const [numChild, setNumChild] = useState<number>(0)

  // Result state
  const [result, setResult] = useState<PriceCheckResult | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  // Online prices state
  const [onlineChannels, setOnlineChannels] = useState<OnlineChannelPriceResult[]>([])
  const [scanningOnline, setScanningOnline] = useState<boolean>(false)

  // Channel URLs configuration state
  const [channelUrls, setChannelUrls] = useState<ChannelUrlConfig>({})
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  // Sync selected room from URL param if present
  useEffect(() => {
    if (queryRoom && queryRoom !== selectedRoomId) {
      setSelectedRoom(queryRoom)
    }
  }, [queryRoom, selectedRoomId, setSelectedRoom])

  // Load stored channel URLs whenever selected room changes
  useEffect(() => {
    setChannelUrls(getStoredChannelUrls(selectedRoomId))
  }, [selectedRoomId])

  // Set default dates if none provided
  useEffect(() => {
    if (!checkIn) {
      const today = getTodayString()
      setCheckIn(today)
      setCheckOut(getTomorrowString(today))
    }
  }, [checkIn])

  // Clear result when room changes to avoid displaying stale data
  useEffect(() => {
    setResult(null)
    setOnlineChannels([])
  }, [selectedRoomId])

  const handleCheckInChange = (newCheckIn: string) => {
    setCheckIn(newCheckIn)
    // If new checkIn is on or after checkOut, automatically advance checkOut by 1 day
    if (checkOut && newCheckIn >= checkOut) {
      setCheckOut(getTomorrowString(newCheckIn))
    }
  }

  // Scan online channels via backend crawler
  const scanOnlinePrices = useCallback(
    async (basePrice: number, checkInDate: string, checkOutDate: string, adults: number, children: number) => {
      setScanningOnline(true)
      try {
        const response = await fetch('/api/dashboard/price-check/online', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkIn: checkInDate,
            checkOut: checkOutDate,
            numAdult: adults,
            numChild: children,
            basePrice,
            roomId: selectedRoomId || undefined,
            channels: channelUrls,
          }),
        })

        if (!response.ok) {
          throw new Error('שגיאה בסריקת מחירים מקוונת')
        }

        const data = await response.json()
        if (Array.isArray(data.channels)) {
          setOnlineChannels(data.channels)
        }
      } catch (err) {
        console.error('Error scanning online channels:', err)
        // Fallback: build initial channel list with expected Hostly prices
        const now = new Date().toISOString()
        const defaultChannels: OnlineChannelPriceResult[] = [
          {
            channelKey: 'airbnb',
            name: 'Airbnb',
            url: buildChannelUrl('airbnb', channelUrls.airbnb || '', { checkIn: checkInDate, checkOut: checkOutDate, numAdult: adults, numChild: children }),
            status: channelUrls.airbnb ? 'error' : 'no_url',
            statusMessage: channelUrls.airbnb ? 'שגיאה בסריקה' : 'לא הוגדר קישור',
            hostlyPrice: calculateHostlyPrice('airbnb', basePrice),
            beds24Price: calculateHostlyPrice('airbnb', basePrice),
            onlinePrice: null,
            currency: 'ILS',
            diff: null,
            diffPercent: null,
            matchStatus: 'unknown',
            matchMessage: 'לא נסרק',
            fetchedAt: now,
          },
          {
            channelKey: 'booking',
            name: 'Booking.com',
            url: buildChannelUrl('booking', channelUrls.booking || '', { checkIn: checkInDate, checkOut: checkOutDate, numAdult: adults, numChild: children }),
            status: channelUrls.booking ? 'error' : 'no_url',
            statusMessage: channelUrls.booking ? 'שגיאה בסריקה' : 'לא הוגדר קישור',
            hostlyPrice: calculateHostlyPrice('booking', basePrice),
            beds24Price: calculateHostlyPrice('booking', basePrice),
            onlinePrice: null,
            currency: 'ILS',
            diff: null,
            diffPercent: null,
            matchStatus: 'unknown',
            matchMessage: 'לא נסרק',
            fetchedAt: now,
          },
          {
            channelKey: 'direct',
            name: 'אתר הזמנות ישיר',
            url: buildChannelUrl('direct', channelUrls.direct || '', { checkIn: checkInDate, checkOut: checkOutDate, numAdult: adults, numChild: children }),
            status: channelUrls.direct ? 'error' : 'no_url',
            statusMessage: channelUrls.direct ? 'שגיאה בסריקה' : 'לא הוגדר קישור',
            hostlyPrice: calculateHostlyPrice('direct', basePrice),
            beds24Price: calculateHostlyPrice('direct', basePrice),
            onlinePrice: null,
            currency: 'ILS',
            diff: null,
            diffPercent: null,
            matchStatus: 'unknown',
            matchMessage: 'לא נסרק',
            fetchedAt: now,
          },
        ]
        setOnlineChannels(defaultChannels)
      } finally {
        setScanningOnline(false)
      }
    },
    [channelUrls, selectedRoomId]
  )

  const handleCheckPrice = useCallback(async () => {
    const validation = validatePriceCheckInput({
      checkIn,
      checkOut,
      numAdult,
      numChild,
    })

    if (!validation.valid) {
      toast.error(validation.error || 'נתונים אינם תקינים')
      return
    }

    setLoading(true)
    setResult(null)
    setOnlineChannels([])

    try {
      const response = await fetch('/api/dashboard/price-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkIn,
          checkOut,
          numAdult,
          numChild,
          ...(selectedRoomId ? { roomId: selectedRoomId } : {}),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'בדיקת המחיר נכשלה')
      }

      const data: PriceCheckResult = await response.json()
      setResult(data)

      if (data.available) {
        toast.success('מחיר וזמינות נמצאו בהצלחה!')

        // Initialize immediate channels with Hostly & Beds24 price
        const initialChannels: OnlineChannelPriceResult[] = [
          {
            channelKey: 'airbnb',
            name: 'Airbnb',
            url: buildChannelUrl('airbnb', channelUrls.airbnb || '', { checkIn, checkOut, numAdult, numChild }),
            status: 'no_url',
            statusMessage: 'ממתין לסריקה',
            hostlyPrice: calculateHostlyPrice('airbnb', data.price),
            beds24Price: calculateHostlyPrice('airbnb', data.price),
            onlinePrice: null,
            currency: data.currency || 'ILS',
            diff: null,
            diffPercent: null,
            matchStatus: 'unknown',
            matchMessage: 'ממתין לסריקה',
            fetchedAt: new Date().toISOString(),
          },
          {
            channelKey: 'booking',
            name: 'Booking.com',
            url: buildChannelUrl('booking', channelUrls.booking || '', { checkIn, checkOut, numAdult, numChild }),
            status: 'no_url',
            statusMessage: 'ממתין לסריקה',
            hostlyPrice: calculateHostlyPrice('booking', data.price),
            beds24Price: calculateHostlyPrice('booking', data.price),
            onlinePrice: null,
            currency: data.currency || 'ILS',
            diff: null,
            diffPercent: null,
            matchStatus: 'unknown',
            matchMessage: 'ממתין לסריקה',
            fetchedAt: new Date().toISOString(),
          },
          {
            channelKey: 'direct',
            name: 'אתר הזמנות ישיר',
            url: buildChannelUrl('direct', channelUrls.direct || '', { checkIn, checkOut, numAdult, numChild }),
            status: 'no_url',
            statusMessage: 'ממתין לסריקה',
            hostlyPrice: calculateHostlyPrice('direct', data.price),
            beds24Price: calculateHostlyPrice('direct', data.price),
            onlinePrice: null,
            currency: data.currency || 'ILS',
            diff: null,
            diffPercent: null,
            matchStatus: 'unknown',
            matchMessage: 'ממתין לסריקה',
            fetchedAt: new Date().toISOString(),
          },
        ]
        setOnlineChannels(initialChannels)

        // Trigger live crawler
        scanOnlinePrices(data.price, checkIn, checkOut, numAdult, numChild)
      } else {
        toast.warning('התאריכים אינם זמינים להזמנה')
      }
    } catch (error) {
      console.error('Error checking price:', error)
      toast.error(error instanceof Error ? error.message : 'שגיאה בבדיקת מחיר')
    } finally {
      setLoading(false)
    }
  }, [checkIn, checkOut, numAdult, numChild, selectedRoomId, channelUrls, scanOnlinePrices])

  // Auto trigger if arriving with queryAuto
  useEffect(() => {
    if (queryAuto && queryCheckIn && queryCheckOut && !result && !loading) {
      handleCheckPrice()
    }
  }, [queryAuto, queryCheckIn, queryCheckOut, result, loading, handleCheckPrice])

  const handleSaveChannelUrls = () => {
    setStoredChannelUrls(selectedRoomId, channelUrls)
    toast.success('קישורי הערוצים נשמרו בהצלחה!')
    setSettingsOpen(false)

    // If we have an existing available result, refresh the online scan with the new URLs
    if (result && result.available) {
      scanOnlinePrices(result.price, checkIn, checkOut, numAdult, numChild)
    }
  }

  const handleRescanSingleChannel = async (channelKey: 'airbnb' | 'booking' | 'direct') => {
    if (!result || !result.available) return
    toast.info(`סורק מחיר מחדש בערוץ ${channelKey}…`)
    await scanOnlinePrices(result.price, checkIn, checkOut, numAdult, numChild)
  }

  if (status === 'loading') {
    return <DashboardLoader variant="fullscreen" label="טוען בדיקת מחיר…" />
  }

  if (!session) {
    return null
  }

  const todayStr = getTodayString()
  const minCheckOutStr = checkIn || todayStr
  const channelPrices = result && result.available ? calculateChannelPrices(result.price) : []

  return (
    <main
      className="price-check-page"
      data-testid="price-check-page"
      dir="rtl"
      style={{ minHeight: '100vh', background: 'transparent' }}
    >
      <Toaster position="top-center" richColors closeButton dir="rtl" />

      {/* Top Header / Bottom Nav Bridge */}
      <div className="container py-3 py-md-4">
        <div className="mb-3 mb-md-4">
          <DashboardHeader
            session={session}
            currentPage="price-check"
            showLandingPageButton={true}
          />
        </div>

        {/* Page Title & Subtitle */}
        <PageHeader
          title="בדיקת מחיר וזמינות"
          subtitle="בדיקת זמינות, סנכרון מחירים בין הוסטלי ל-Beds24 וסריקת מחירים חיים באתרי ההזמנות (Airbnb, Booking.com ואתר ישיר)"
          icon={<Globe size={22} />}
        />

        {/* Room Switcher (Multi-room support) */}
        <RoomTabs />

        {/* Channel URL Settings Card (Collapsible) */}
        <ChannelUrlSettings
          roomId={selectedRoomId || ''}
          urls={channelUrls}
          onChange={setChannelUrls}
          onSave={handleSaveChannelUrls}
          onClose={() => setSettingsOpen(false)}
          open={settingsOpen}
        />

        {/* Search Parameters Card */}
        <div className="card border-0 shadow-sm hostly-dark-card mb-4" data-testid="price-check-form-card">
          <div
            className="card-header border-0 py-3 px-4 d-flex align-items-center justify-content-between"
            style={{ borderBottom: '1px solid var(--hborder-light)' }}
          >
            <div className="d-flex align-items-center gap-2">
              <CalendarDays size={18} style={{ color: 'var(--hb)' }} />
              <h2 className="mb-0 fw-semibold" style={{ color: 'var(--htxt-1)', fontSize: '1rem' }}>
                הגדרת תאריכים ואורחים לבדיקה
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setSettingsOpen((prev) => !prev)}
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1.5"
              style={{ fontSize: '0.82rem', borderRadius: '6px' }}
              title="הגדרת קישורי רישום בערוצים השונים"
            >
              <SlidersHorizontal size={14} />
              <span>הגדרת קישורי ערוצים</span>
            </button>
          </div>

          <div className="card-body p-3 p-md-4">
            <div className="row g-3 g-md-4">
              {/* Check-in Date */}
              <div className="col-12 col-md-6">
                <label
                  htmlFor="check-in-date"
                  className="form-label mb-1.5 fw-semibold d-flex align-items-center gap-1.5"
                  style={{ color: 'var(--htxt-1)', fontSize: '0.9rem' }}
                >
                  <Calendar size={16} style={{ color: 'var(--hb)' }} />
                  תאריך כניסה
                </label>
                <input
                  id="check-in-date"
                  type="date"
                  className="form-control"
                  value={checkIn}
                  onChange={(e) => handleCheckInChange(e.target.value)}
                  min={todayStr}
                  data-testid="check-in-input"
                  style={{
                    height: '44px',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--hborder)',
                    color: 'var(--htxt-1)',
                    background: '#fff',
                  }}
                />
              </div>

              {/* Check-out Date */}
              <div className="col-12 col-md-6">
                <label
                  htmlFor="check-out-date"
                  className="form-label mb-1.5 fw-semibold d-flex align-items-center gap-1.5"
                  style={{ color: 'var(--htxt-1)', fontSize: '0.9rem' }}
                >
                  <Calendar size={16} style={{ color: 'var(--hb)' }} />
                  תאריך יציאה
                </label>
                <input
                  id="check-out-date"
                  type="date"
                  className="form-control"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  min={minCheckOutStr}
                  data-testid="check-out-input"
                  style={{
                    height: '44px',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--hborder)',
                    color: 'var(--htxt-1)',
                    background: '#fff',
                  }}
                />
              </div>

              {/* Number of Adults */}
              <div className="col-12 col-md-6">
                <NumberStepper
                  id="adults-input"
                  name="numAdult"
                  label="מספר מבוגרים"
                  sublabel="גיל 18+"
                  icon={<Users size={16} />}
                  value={numAdult}
                  min={1}
                  max={20}
                  onChange={setNumAdult}
                  testId="adults"
                />
              </div>

              {/* Number of Children */}
              <div className="col-12 col-md-6">
                <NumberStepper
                  id="children-input"
                  name="numChild"
                  label="מספר ילדים"
                  sublabel="גיל 0-17"
                  icon={<Baby size={16} />}
                  value={numChild}
                  min={0}
                  max={20}
                  onChange={setNumChild}
                  testId="children"
                />
              </div>

              {/* Submit Button */}
              <div className="col-12 d-flex justify-content-center justify-content-md-start pt-2">
                <button
                  type="button"
                  onClick={handleCheckPrice}
                  disabled={loading}
                  data-testid="price-check-submit-btn"
                  className="hostly-btn hostly-btn-on-light hostly-btn-primary hostly-btn-lg"
                  style={{ minWidth: '220px' }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="spin" />
                      בודק זמינות ומחיר…
                    </>
                  ) : (
                    <>
                      <Search size={18} />
                      בדוק זמינות ומחירים ברשת
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="mt-4" data-testid="price-check-results-section">
            {result.available ? (
              <div
                className="card border-0 shadow-sm hostly-dark-card overflow-hidden"
                data-testid="price-check-result-available"
              >
                {/* Available Result Header */}
                <div
                  className="p-4 p-md-5 text-center"
                  style={{
                    background: 'linear-gradient(180deg, var(--hb-50) 0%, var(--hsurf) 100%)',
                    borderBottom: '1px solid var(--hborder-light)',
                  }}
                >
                  <div className="mb-3 d-inline-flex">
                    <span
                      className="badge rounded-pill d-inline-flex align-items-center gap-1.5 px-3 py-1.5 fw-semibold"
                      style={{
                        background: '#ecfdf5',
                        color: '#047857',
                        border: '1px solid #a7f3d0',
                        fontSize: '0.875rem',
                      }}
                      data-testid="availability-badge-success"
                    >
                      <CheckCircle2 size={16} />
                      זמין להזמנה
                    </span>
                  </div>

                  <div className="mb-2">
                    <span className="text-muted small d-block mb-1 fw-medium">סה״כ מחיר בסיס לשהייה (הוסטלי)</span>
                    <h3
                      className="mb-0 fw-bold"
                      style={{
                        fontSize: 'clamp(2.25rem, 5vw, 3rem)',
                        color: 'var(--hb)',
                        letterSpacing: '-0.02em',
                      }}
                      data-testid="result-total-price"
                    >
                      {formatCurrency(result.price)}
                    </h3>
                  </div>

                  <div className="text-muted small mt-2">
                    {formatDate(result.checkIn)} – {formatDate(result.checkOut)}
                  </div>
                </div>

                {/* Summary Metrics Grid */}
                <div className="p-3 p-md-4" style={{ borderBottom: '1px solid var(--hborder-light)' }}>
                  <div className="row g-3 text-center">
                    <div className="col-4">
                      <div
                        className="hostly-dark-stat rounded-3 p-3 h-100 d-flex flex-column align-items-center justify-content-center"
                        style={{ background: 'var(--hn-50)', border: '1px solid var(--hborder-light)' }}
                      >
                        <Moon size={20} style={{ color: 'var(--hb)', marginBottom: '6px' }} />
                        <span className="text-muted small mb-1">מספר לילות</span>
                        <strong style={{ color: 'var(--htxt-1)', fontSize: '1.1rem' }}>
                          {result.nights} {result.nights === 1 ? 'לילה' : 'לילות'}
                        </strong>
                      </div>
                    </div>

                    <div className="col-4">
                      <div
                        className="hostly-dark-stat rounded-3 p-3 h-100 d-flex flex-column align-items-center justify-content-center"
                        style={{ background: 'var(--hn-50)', border: '1px solid var(--hborder-light)' }}
                      >
                        <Tag size={20} style={{ color: 'var(--hb)', marginBottom: '6px' }} />
                        <span className="text-muted small mb-1">מחיר ממוצע ללילה</span>
                        <strong style={{ color: 'var(--htxt-1)', fontSize: '1.1rem' }}>
                          {formatCurrency(result.pricePerNight)}
                        </strong>
                      </div>
                    </div>

                    <div className="col-4">
                      <div
                        className="hostly-dark-stat rounded-3 p-3 h-100 d-flex flex-column align-items-center justify-content-center"
                        style={{ background: 'var(--hn-50)', border: '1px solid var(--hborder-light)' }}
                      >
                        <Users size={20} style={{ color: 'var(--hb)', marginBottom: '6px' }} />
                        <span className="text-muted small mb-1">הרכב אורחים</span>
                        <strong style={{ color: 'var(--htxt-1)', fontSize: '1.1rem' }}>
                          {result.numAdult} מבוגרים
                          {result.numChild > 0 ? `, ${result.numChild} ילדים` : ''}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Channel Cards Section */}
                <div className="p-3 p-md-4" style={{ borderBottom: '1px solid var(--hborder-light)' }}>
                  <div className="mb-3">
                    <h4 className="fw-bold mb-1" style={{ color: 'var(--htxt-1)', fontSize: '1rem' }}>
                      השוואת מחירי ערוצים מחושבים
                    </h4>
                    <p className="text-muted small mb-0">
                      מחיר סופי מומלץ לאורח בכל ערוץ, בהתאם לשיעור העמלות המוגדר
                    </p>
                  </div>

                  <div className="row g-3">
                    {channelPrices.map((channel) => (
                      <div key={channel.channelKey} className="col-12 col-md-4">
                        <div
                          className="rounded-3 p-3 h-100 d-flex flex-column justify-content-between"
                          style={{
                            background: 'var(--hn-50)',
                            border: '1px solid var(--hborder)',
                            transition: 'border-color 0.15s',
                          }}
                          data-testid={`channel-${channel.channelKey}`}
                        >
                          <div>
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <div className="d-flex align-items-center gap-2">
                                {channel.logoUrl ? (
                                  <img
                                    src={channel.logoUrl}
                                    alt={channel.name}
                                    style={{
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '50%',
                                      objectFit: 'cover',
                                    }}
                                  />
                                ) : (
                                  <div
                                    className="d-flex align-items-center justify-content-center rounded-circle"
                                    style={{
                                      width: '24px',
                                      height: '24px',
                                      background: 'var(--hb-100)',
                                      color: 'var(--hb)',
                                    }}
                                  >
                                    <Globe size={15} />
                                  </div>
                                )}
                                <span className="fw-bold" style={{ color: 'var(--htxt-1)', fontSize: '0.95rem' }}>
                                  {channel.name}
                                </span>
                              </div>

                              <span
                                className="badge fw-medium"
                                style={{
                                  background: channel.markupPercent > 0 ? 'var(--hb-100)' : '#f3f4f6',
                                  color: channel.markupPercent > 0 ? 'var(--hb)' : 'var(--htxt-2)',
                                  fontSize: '0.75rem',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                }}
                              >
                                {channel.markupPercent > 0 ? `+${channel.markupPercent}%` : 'בסיס'}
                              </span>
                            </div>

                            <div className="my-2">
                              <span
                                className="fw-bold"
                                style={{
                                  fontSize: '1.45rem',
                                  color: 'var(--htxt-1)',
                                }}
                              >
                                {formatCurrency(channel.price)}
                              </span>
                            </div>
                          </div>

                          <div
                            className="mt-2 pt-2 text-muted"
                            style={{
                              borderTop: '1px solid var(--hborder-light)',
                              fontSize: '0.78rem',
                              lineHeight: 1.35,
                            }}
                          >
                            {channel.note}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Comparison Table Component */}
                {onlineChannels.length > 0 && (
                  <div className="p-3 p-md-4">
                    <PriceComparisonTable
                      channels={onlineChannels}
                      basePrice={result.price}
                      nights={result.nights}
                      isScanning={scanningOnline}
                      onRescanAll={() => scanOnlinePrices(result.price, checkIn, checkOut, numAdult, numChild)}
                      onRescanChannel={handleRescanSingleChannel}
                      onOpenSettings={() => setSettingsOpen(true)}
                    />
                  </div>
                )}
              </div>
            ) : (
              /* Unavailable State */
              <div
                className="card border-0 shadow-sm hostly-dark-card text-center p-4 p-md-5"
                data-testid="price-check-result-unavailable"
              >
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                  style={{
                    width: '64px',
                    height: '64px',
                    background: '#fef3c7',
                    color: '#d97706',
                  }}
                >
                  <CalendarX2 size={32} />
                </div>
                <h3 className="fw-bold mb-2" style={{ color: 'var(--htxt-1)', fontSize: '1.25rem' }}>
                  התאריכים אינם זמינים
                </h3>
                <p className="text-muted mb-0" style={{ maxWidth: '420px', margin: '0 auto', fontSize: '0.9rem' }}>
                  היחידה תפוסה או חסומה בתאריכים שנבחרו ({formatDate(checkIn)} – {formatDate(checkOut)}). אנא בחר תאריכים אחרים.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
