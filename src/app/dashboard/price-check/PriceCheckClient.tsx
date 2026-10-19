'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast, Toaster } from 'sonner'
import DashboardHeader from '@/components/DashboardHeader'
import DashboardLoader from '@/components/DashboardLoader'
import RoomTabs from '../components/RoomTabs'
import { useSelectedRoom } from '@/lib/rooms/RoomContext'
import { formatCurrency } from '@/lib/dashboard/utils'
import { Button, Card, PageHeader } from '@/components/ui'
import { CalendarDays, CheckCircle2, Moon, Banknote, Search, Users, CalendarX } from 'lucide-react'

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

const CHANNEL_PRICES = [
  { name: 'Airbnb', multiplier: 1.18, helper: '+18%' },
  { name: 'Booking', multiplier: 1.21, helper: '+21%' },
  { name: 'ישירות', multiplier: 1, helper: 'מחיר בסיס' },
]

const labelStyle: React.CSSProperties = {
  color: 'var(--htxt-2)',
  fontSize: 12.5,
  fontWeight: 600,
}

// ─── Presentational pieces ────────────────────────────────────────────────────

function ResultFact({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="d-flex flex-column align-items-center gap-1 text-center" style={{ color: 'var(--htxt-2)', fontSize: 14 }}>
      <span style={{ color: 'var(--hb)' }}>{icon}</span>
      <span style={{ fontWeight: 600, color: 'var(--htxt-1)' }}>{children}</span>
    </div>
  )
}

function AvailableResult({ result }: { result: PriceCheckResult }) {
  return (
    <div>
      <div className="text-center mb-3">
        <span
          className="d-inline-flex align-items-center gap-1"
          style={{
            padding: '3px 12px',
            borderRadius: 9999,
            fontSize: 12.5,
            fontWeight: 600,
            color: '#15803d',
            background: 'rgba(34,197,94,0.12)',
            border: '1px solid rgba(34,197,94,0.3)',
          }}
        >
          <CheckCircle2 size={13} />
          זמין
        </span>
        <div style={{ fontSize: 'clamp(2rem, 7vw, 2.75rem)', fontWeight: 700, color: 'var(--hb)', lineHeight: 1.2, marginTop: 8 }}>
          {formatCurrency(result.price)}
        </div>
        <div style={{ color: 'var(--htxt-3)', fontSize: 13 }}>
          {new Date(result.checkIn).toLocaleDateString('he-IL')} – {new Date(result.checkOut).toLocaleDateString('he-IL')}
        </div>
      </div>

      <div className="row g-3 py-3" style={{ borderTop: '1px solid var(--hborder-light)' }}>
        <div className="col-4">
          <ResultFact icon={<Moon size={20} />}>{result.nights} לילות</ResultFact>
        </div>
        <div className="col-4">
          <ResultFact icon={<Banknote size={20} />}>{formatCurrency(result.pricePerNight)} ללילה</ResultFact>
        </div>
        <div className="col-4">
          <ResultFact icon={<Users size={20} />}>
            {result.numAdult} מבוגרים
            {result.numChild > 0 && `, ${result.numChild} ילדים`}
          </ResultFact>
        </div>
      </div>

      <div className="pt-3" style={{ borderTop: '1px solid var(--hborder-light)' }}>
        <div className="mb-2" style={{ color: 'var(--htxt-2)', fontSize: 13, fontWeight: 600 }}>
          מחיר לאורח בכל ערוץ
        </div>
        <div className="row g-2">
          {CHANNEL_PRICES.map((channel) => (
            <div className="col-4" key={channel.name}>
              <div
                className="text-center"
                style={{ background: 'var(--hn-50)', border: '1px solid var(--hborder)', borderRadius: 8, padding: '10px 6px' }}
              >
                <div style={{ color: 'var(--htxt-3)', fontSize: 12, fontWeight: 500 }}>{channel.name}</div>
                <div style={{ color: 'var(--htxt-1)', fontSize: 16, fontWeight: 700 }}>
                  {formatCurrency(result.price * channel.multiplier)}
                </div>
                <div style={{ color: 'var(--htxt-3)', fontSize: 11 }}>{channel.helper}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function UnavailableResult() {
  return (
    <div className="text-center py-3">
      <div style={{ color: 'var(--htxt-3)' }}>
        <CalendarX size={36} />
      </div>
      <h4 className="mt-2 mb-1" style={{ color: 'var(--htxt-1)', fontSize: 18, fontWeight: 600 }}>
        לא זמין
      </h4>
      <p className="mb-0" style={{ color: 'var(--htxt-3)', fontSize: 14 }}>
        התאריכים שבחרת אינם זמינים להזמנה
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PriceCheckClient() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { selectedRoomId } = useSelectedRoom()

  // Form state
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [numAdult, setNumAdult] = useState(2)
  const [numChild, setNumChild] = useState(0)

  // Result state
  const [result, setResult] = useState<PriceCheckResult | null>(null)
  const [loading, setLoading] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  // Set default dates (today and tomorrow)
  useEffect(() => {
    if (!checkIn) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      setCheckIn(today.toISOString().split('T')[0])

      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      setCheckOut(tomorrow.toISOString().split('T')[0])
    }
  }, [checkIn])

  const handleCheckPrice = async () => {
    // Validation
    if (!checkIn || !checkOut) {
      toast.error('יש למלא תאריכי כניסה ויציאה')
      return
    }

    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (checkInDate < today) {
      toast.error('תאריך כניסה לא יכול להיות בעבר')
      return
    }

    if (checkOutDate <= checkInDate) {
      toast.error('תאריך יציאה חייב להיות אחרי תאריך כניסה')
      return
    }

    if (numAdult < 1) {
      toast.error('נדרש לפחות מבוגר אחד')
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
        const errorData = await response.json()
        throw new Error(errorData.error || 'בדיקת המחיר נכשלה')
      }

      const data = await response.json()
      setResult(data)

      if (data.available) {
        toast.success('מחיר נמצא בהצלחה!')
      } else {
        toast.warning('התאריכים לא זמינים')
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

  const todayIso = new Date().toISOString().split('T')[0]

  return (
    <main dir="rtl" style={{ minHeight: '100vh', background: 'var(--hn-50)' }}>
      <Toaster position="top-center" dir="rtl" />
      <DashboardHeader session={session} currentPage="price-check" showLandingPageButton={true} />

      <div className="container-fluid py-3 py-md-4 px-3 px-md-4">
        <PageHeader
          title="בדיקת מחיר וזמינות"
          subtitle="הזן תאריכים ומספר אורחים לבדיקת מחיר"
          icon={<CalendarDays size={20} />}
        />

        <RoomTabs />

        <div className="row justify-content-center">
          <div className="col-12 col-lg-8 col-xl-6">
            <Card padded className="hostly-dark-card">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label mb-1" style={labelStyle} htmlFor="price-check-in">
                    תאריך כניסה
                  </label>
                  <input
                    id="price-check-in"
                    type="date"
                    className="form-control"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    min={todayIso}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label mb-1" style={labelStyle} htmlFor="price-check-out">
                    תאריך יציאה
                  </label>
                  <input
                    id="price-check-out"
                    type="date"
                    className="form-control"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    min={checkIn || todayIso}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label mb-1" style={labelStyle} htmlFor="price-check-adults">
                    מספר מבוגרים
                  </label>
                  <input
                    id="price-check-adults"
                    type="number"
                    className="form-control"
                    value={numAdult}
                    onChange={(e) => setNumAdult(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    max="20"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label mb-1" style={labelStyle} htmlFor="price-check-children">
                    מספר ילדים
                  </label>
                  <input
                    id="price-check-children"
                    type="number"
                    className="form-control"
                    value={numChild}
                    onChange={(e) => setNumChild(Math.max(0, parseInt(e.target.value) || 0))}
                    min="0"
                    max="20"
                  />
                </div>

                <div className="col-12">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-100"
                    loading={loading}
                    iconStart={<Search size={18} />}
                    onClick={handleCheckPrice}
                  >
                    {loading ? 'בודק מחיר...' : 'בדוק מחיר'}
                  </Button>
                </div>
              </div>

              {result && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--hborder-light)' }}>
                  {result.available ? <AvailableResult result={result} /> : <UnavailableResult />}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
