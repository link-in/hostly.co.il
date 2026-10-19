'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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
} from 'lucide-react'
import DashboardHeader from '@/components/DashboardHeader'
import DashboardLoader from '@/components/DashboardLoader'
import { PageHeader, NumberStepper } from '@/components/ui'
import RoomTabs from '../components/RoomTabs'
import { useSelectedRoom } from '@/lib/rooms/RoomContext'
import { formatCurrency, formatDate } from '@/lib/dashboard/utils'
import { calculateChannelPrices } from '@/lib/pricing/channelPricing'
import { validatePriceCheckInput } from '@/lib/pricing/priceCheckValidation'

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

export default function PriceCheckClient() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { selectedRoomId } = useSelectedRoom()

  // Form state
  const [checkIn, setCheckIn] = useState<string>('')
  const [checkOut, setCheckOut] = useState<string>('')
  const [numAdult, setNumAdult] = useState<number>(2)
  const [numChild, setNumChild] = useState<number>(0)

  // Result state
  const [result, setResult] = useState<PriceCheckResult | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  // Set default dates (today and tomorrow)
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
  }, [selectedRoomId])

  const handleCheckInChange = (newCheckIn: string) => {
    setCheckIn(newCheckIn)
    // If new checkIn is on or after checkOut, automatically advance checkOut by 1 day
    if (checkOut && newCheckIn >= checkOut) {
      setCheckOut(getTomorrowString(newCheckIn))
    }
  }

  const handleCheckPrice = async () => {
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
      } else {
        toast.warning('התאריכים אינם זמינים להזמנה')
      }
    } catch (error) {
      console.error('Error checking price:', error)
      toast.error(error instanceof Error ? error.message : 'שגיאה בבדיקת מחיר')
    } finally {
      setLoading(false)
    }
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
          subtitle="בדיקת זמינות, מחיר לינה לתאריכים ספציפיים וחישוב מחיר לערוצי ההפצה"
          icon={<Search size={22} />}
        />

        {/* Room Switcher (Multi-room support) */}
        <RoomTabs />

        {/* Search Parameters Card */}
        <div className="card border-0 shadow-sm hostly-dark-card mb-4" data-testid="price-check-form-card">
          <div
            className="card-header border-0 py-3 px-4 d-flex align-items-center gap-2"
            style={{ borderBottom: '1px solid var(--hborder-light)' }}
          >
            <CalendarDays size={18} style={{ color: 'var(--hb)' }} />
            <h2 className="mb-0 fw-semibold" style={{ color: 'var(--htxt-1)', fontSize: '1rem' }}>
              הגדרת תאריכים ואורחים
            </h2>
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
                  style={{ minWidth: '200px' }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="spin" />
                      בודק זמינות ומחיר…
                    </>
                  ) : (
                    <>
                      <Search size={18} />
                      בדוק זמינות ומחיר
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
                    <span className="text-muted small d-block mb-1 fw-medium">סה״כ מחיר בסיס לשהייה</span>
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

                {/* Channel Comparison Section */}
                <div className="p-3 p-md-4">
                  <div className="mb-3">
                    <h4 className="fw-bold mb-1" style={{ color: 'var(--htxt-1)', fontSize: '1rem' }}>
                      השוואת מחירים לפי ערוצי הפצה
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
