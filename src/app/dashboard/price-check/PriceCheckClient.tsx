'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast, Toaster } from 'sonner'
import DashboardHeader from '@/components/DashboardHeader'
import { formatCurrency } from '@/lib/dashboard/utils'

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

export default function PriceCheckClient() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
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
      router.push('/dashboard/login')
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
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">טוען...</span>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Toaster position="top-center" dir="rtl" />
      
      <div className="container py-4">
        <DashboardHeader 
          session={session} 
          currentPage="price-check" 
          showLandingPageButton={true} 
        />

        <div className="row mt-4">
          <div className="col-12">
            {/* Main Card */}
            <div 
              className="card shadow-lg"
              style={{
                borderRadius: '12px',
                border: 'none',
                background: 'white',
              }}
            >
              <div 
                className="card-header text-white text-center"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '12px 12px 0 0',
                  padding: '1.5rem',
                }}
              >
                <h4 className="mb-0" style={{ fontWeight: '600' }}>💰 בדיקת מחיר וזמינות</h4>
                <p className="mb-0 mt-2" style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                  הזן תאריכים ומספר אורחים לבדיקת מחיר
                </p>
              </div>

              <div className="card-body p-4">
                <div className="row g-3">
                  {/* Check-in Date */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">תאריך כניסה</label>
                    <input
                      type="date"
                      className="form-control"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '2px solid #e0e0e0',
                      }}
                    />
                  </div>

                  {/* Check-out Date */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">תאריך יציאה</label>
                    <input
                      type="date"
                      className="form-control"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      min={checkIn || new Date().toISOString().split('T')[0]}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '2px solid #e0e0e0',
                      }}
                    />
                  </div>

                  {/* Number of Adults */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">מספר מבוגרים</label>
                    <input
                      type="number"
                      className="form-control"
                      value={numAdult}
                      onChange={(e) => setNumAdult(Math.max(1, parseInt(e.target.value) || 1))}
                      min="1"
                      max="20"
                      style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '2px solid #e0e0e0',
                      }}
                    />
                  </div>

                  {/* Number of Children */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">מספר ילדים</label>
                    <input
                      type="number"
                      className="form-control"
                      value={numChild}
                      onChange={(e) => setNumChild(Math.max(0, parseInt(e.target.value) || 0))}
                      min="0"
                      max="20"
                      style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '2px solid #e0e0e0',
                      }}
                    />
                  </div>

                  {/* Check Price Button */}
                  <div className="col-12 text-center mt-4">
                    <button
                      onClick={handleCheckPrice}
                      disabled={loading}
                      className="btn btn-lg text-white fw-semibold"
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        borderRadius: '25px',
                        padding: '0.75rem 3rem',
                        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)'
                      }}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          בודק מחיר...
                        </>
                      ) : (
                        '🔍 בדוק מחיר'
                      )}
                    </button>
                  </div>
                </div>

                {/* Results */}
                {result && (
                  <div className="mt-4">
                    <hr />
                    {result.available ? (
                      <div 
                        className="text-center p-4"
                        style={{
                          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                          borderRadius: '12px',
                          color: 'white',
                        }}
                      >
                        <div className="mb-3">
                          <span 
                            className="badge bg-white text-success fw-semibold"
                            style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                          >
                            ✓ זמין
                          </span>
                        </div>
                        
                        <h2 className="mb-3" style={{ fontSize: '3rem', fontWeight: '700' }}>
                          {formatCurrency(result.price)}
                        </h2>
                        
                        <div className="row text-center mt-4">
                          <div className="col-4">
                            <div style={{ fontSize: '2rem' }}>🌙</div>
                            <div className="mt-2 fw-semibold">{result.nights} לילות</div>
                          </div>
                          <div className="col-4">
                            <div style={{ fontSize: '2rem' }}>💵</div>
                            <div className="mt-2 fw-semibold">{formatCurrency(result.pricePerNight)} ללילה</div>
                          </div>
                          <div className="col-4">
                            <div style={{ fontSize: '2rem' }}>👥</div>
                            <div className="mt-2 fw-semibold">
                              {result.numAdult} מבוגרים
                              {result.numChild > 0 && `, ${result.numChild} ילדים`}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.3)' }}>
                          <small style={{ opacity: 0.9 }}>
                            📅 {new Date(result.checkIn).toLocaleDateString('he-IL')} - {new Date(result.checkOut).toLocaleDateString('he-IL')}
                          </small>
                        </div>

                        {/* Channel Prices */}
                        <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.3)' }}>
                          <h6 className="mb-3" style={{ opacity: 0.95, fontSize: '0.95rem' }}>💰 מחיר לאורח בכל ערוץ:</h6>
                          <div className="row g-2">
                            <div className="col-4">
                              <div style={{ 
                                background: 'rgba(255,255,255,0.15)', 
                                borderRadius: '8px', 
                                padding: '0.75rem',
                                backdropFilter: 'blur(10px)'
                              }}>
                                <div style={{ fontSize: '1.3rem', marginBottom: '0.25rem' }}>🏠</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.25rem' }}>Airbnb</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                                  {formatCurrency(result.price * 1.18)}
                                </div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>+18%</div>
                              </div>
                            </div>
                            <div className="col-4">
                              <div style={{ 
                                background: 'rgba(255,255,255,0.15)', 
                                borderRadius: '8px', 
                                padding: '0.75rem',
                                backdropFilter: 'blur(10px)'
                              }}>
                                <div style={{ fontSize: '1.3rem', marginBottom: '0.25rem' }}>🏨</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.25rem' }}>Booking</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                                  {formatCurrency(result.price * 1.21)}
                                </div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>+21%</div>
                              </div>
                            </div>
                            <div className="col-4">
                              <div style={{ 
                                background: 'rgba(255,255,255,0.15)', 
                                borderRadius: '8px', 
                                padding: '0.75rem',
                                backdropFilter: 'blur(10px)'
                              }}>
                                <div style={{ fontSize: '1.3rem', marginBottom: '0.25rem' }}>✨</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.25rem' }}>ישירות</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                                  {formatCurrency(result.price)}
                                </div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>מחיר בסיס</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="text-center p-4"
                        style={{
                          background: 'linear-gradient(135deg, #a8b3cf 0%, #c6cbd9 100%)',
                          borderRadius: '12px',
                          color: '#333',
                          border: '2px solid #667eea',
                        }}
                      >
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
                        <h4 className="mb-2" style={{ color: '#667eea', fontWeight: '600' }}>לא זמין</h4>
                        <p className="mb-0" style={{ color: '#555' }}>
                          התאריכים שבחרת אינם זמינים להזמנה
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
