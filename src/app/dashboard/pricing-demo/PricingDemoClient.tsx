'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import DashboardHeader from '@/components/DashboardHeader'
import { useSession } from 'next-auth/react'

/**
 * Pricing Calculator Demo Client Component
 * 
 * This component demonstrates how to calculate prices for different platforms
 * to ensure the host receives their desired net price after commissions.
 * 
 * Platform Multipliers:
 * - Airbnb: 1.18 (18% markup to compensate for 15.5% commission)
 * - Booking.com: 1.21 (21% markup for 15% commission + VAT + processing fees)
 * - Direct Website: 1.00 (no commission)
 */
const PricingDemoClient = () => {
  const { data: session } = useSession()
  const [netPrice, setNetPrice] = useState<string>('500')

  // Platform multipliers based on commission structures
  const platformMultipliers = {
    direct: {
      multiplier: 1.00,
      displayName: 'אתר פרטי (Direct)',
      commission: '0%',
      explanation: 'אין עמלה - המארח מקבל את כל התשלום',
      icon: '🏠',
      color: '#10b981', // green
    },
    airbnb: {
      multiplier: 1.18,
      displayName: 'Airbnb',
      commission: '15.5%',
      explanation: 'עמלת Airbnb היא 15.5%. כדי שהמארח יקבל את המחיר הנטו, מוסיפים 18%',
      icon: '🅰️',
      color: '#ff5a5f', // airbnb red
    },
    booking: {
      multiplier: 1.21,
      displayName: 'Booking.com',
      commission: '~17%',
      explanation: '15% עמלה + מע"מ על העמלה + עמלת סליקה. סה"ק צריך להוסיף 21%',
      icon: '🅱️',
      color: '#003580', // booking blue
    },
  }

  const parseNetPrice = (): number => {
    const parsed = parseFloat(netPrice)
    return isNaN(parsed) || parsed < 0 ? 0 : parsed
  }

  const calculatePlatformPrice = (multiplier: number): number => {
    return parseNetPrice() * multiplier
  }

  const calculateCommissionAmount = (platformPrice: number, netPrice: number): number => {
    return platformPrice - netPrice
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
        {/* Header */}
        <div className="mb-3 mb-md-4">
          <DashboardHeader 
            session={session} 
            showLandingPageButton={true}
            currentPage="pricing-demo"
          />
        </div>

        {/* Back Button */}
        <div className="mb-3">
          <Link href="/dashboard">
            <button
              className="btn btn-sm"
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                backdropFilter: 'blur(10px)',
              }}
            >
              ← חזרה לדשבורד
            </button>
          </Link>
        </div>

        {/* Main Card */}
        <div 
          className="card border-0 shadow-lg"
          style={{
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="card-body p-4 p-md-5">
            {/* Title */}
            <div className="text-center mb-4">
              <h1 
                className="h2 fw-bold mb-2"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                💰 מחשבון מחירים חכם
              </h1>
              <p className="text-muted mb-0">
                חשב את המחירים הנכונים לכל פלטפורמה כדי להבטיח את הרווח הנטו שלך
              </p>
            </div>

            {/* Info Banner */}
            <div 
              className="alert mb-4"
              style={{
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                border: '2px solid rgba(102, 126, 234, 0.3)',
                borderRadius: '12px',
              }}
            >
              <div className="d-flex align-items-start gap-3">
                <span style={{ fontSize: '1.5rem' }}>💡</span>
                <div>
                  <h6 className="fw-bold mb-2" style={{ color: '#667eea' }}>
                    למה צריך מחירים שונים?
                  </h6>
                  <p className="mb-0 small text-muted">
                    כל פלטפורמה גובה עמלה שונה. כדי שתקבל את אותו סכום נטו לכיס מכל הזמנה,
                    צריך להגדיר מחירים גבוהים יותר בפלטפורמות עם עמלות גבוהות יותר.
                  </p>
                </div>
              </div>
            </div>

            {/* Net Price Input */}
            <div className="mb-5">
              <label className="form-label fw-bold mb-3" style={{ fontSize: '1.1rem' }}>
                🎯 כמה אתה רוצה לקבל נטו לכיס (ללילה)?
              </label>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <div className="input-group input-group-lg" dir="ltr">
                    <span 
                      className="input-group-text"
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        background: '#667eea',
                        color: 'white',
                        border: '2px solid #667eea',
                        borderRight: 'none',
                      }}
                    >
                      ₪
                    </span>
                    <input
                      type="number"
                      className="form-control"
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        border: '2px solid #667eea',
                        textAlign: 'right',
                        direction: 'ltr',
                      }}
                      value={netPrice}
                      onChange={(e) => setNetPrice(e.target.value)}
                      min="0"
                      step="10"
                      placeholder="0"
                    />
                  </div>
                  <small className="text-muted" style={{ display: 'block', textAlign: 'right' }}>
                    זה הסכום שתקבל בפועל אחרי ניכוי כל העמלות
                  </small>
                </div>
              </div>
            </div>

            {/* Platform Pricing Cards */}
            <div className="mb-4">
              <h3 className="h5 fw-bold mb-3">
                📊 המחירים שצריך להגדיר בכל פלטפורמה:
              </h3>
              
              <div className="row g-3">
                {Object.entries(platformMultipliers).map(([key, platform]) => {
                  const platformPrice = calculatePlatformPrice(platform.multiplier)
                  const commissionAmount = calculateCommissionAmount(platformPrice, parseNetPrice())
                  
                  return (
                    <div key={key} className="col-12 col-md-4">
                      <div 
                        className="card h-100 border-0 shadow-sm"
                        style={{
                          borderRadius: '12px',
                          border: `3px solid ${platform.color}`,
                          transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-5px)'
                          e.currentTarget.style.boxShadow = `0 8px 24px ${platform.color}40`
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = ''
                        }}
                      >
                        <div className="card-body p-4">
                          {/* Platform Icon & Name */}
                          <div className="d-flex align-items-center mb-3">
                            <span style={{ fontSize: '2rem', marginLeft: '0.5rem' }}>
                              {platform.icon}
                            </span>
                            <h5 className="mb-0 fw-bold" style={{ color: platform.color }}>
                              {platform.displayName}
                            </h5>
                          </div>

                          {/* Price Display */}
                          <div 
                            className="text-center py-4 mb-3"
                            style={{
                              background: `linear-gradient(135deg, ${platform.color}15 0%, ${platform.color}05 100%)`,
                              borderRadius: '12px',
                            }}
                          >
                            <div className="text-muted small mb-1">מחיר להצגה</div>
                            <div 
                              className="display-5 fw-bold"
                              style={{ color: platform.color }}
                            >
                              ₪{platformPrice.toFixed(0)}
                            </div>
                            <div className="text-muted small mt-1">ללילה</div>
                          </div>

                          {/* Commission Badge */}
                          <div 
                            className="text-center mb-3 py-2 px-3"
                            style={{
                              background: `${platform.color}20`,
                              borderRadius: '8px',
                            }}
                          >
                            <div className="small fw-semibold" style={{ color: platform.color }}>
                              עמלה: {platform.commission}
                            </div>
                            {commissionAmount > 0 && (
                              <div className="small text-muted">
                                (₪{commissionAmount.toFixed(0)})
                              </div>
                            )}
                          </div>

                          {/* Calculation Formula */}
                          <div 
                            className="small p-3 mb-3"
                            style={{
                              background: '#f8f9fa',
                              borderRadius: '8px',
                              fontFamily: 'monospace',
                            }}
                          >
                            <div className="text-center">
                              <div className="fw-bold mb-1">חישוב:</div>
                              <div>₪{parseNetPrice().toFixed(0)} × {platform.multiplier}</div>
                              <div className="mt-1">= ₪{platformPrice.toFixed(0)}</div>
                            </div>
                          </div>

                          {/* Explanation */}
                          <div className="small text-muted">
                            {platform.explanation}
                          </div>

                          {/* Net Result */}
                          <div 
                            className="mt-3 pt-3"
                            style={{
                              borderTop: '2px dashed #e5e7eb',
                            }}
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="small fw-semibold">תקבל לכיס:</span>
                              <span className="fw-bold" style={{ color: '#10b981', fontSize: '1.1rem' }}>
                                ₪{parseNetPrice().toFixed(0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Example Section */}
            <div 
              className="mt-5 p-4"
              style={{
                background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
              }}
            >
              <h4 className="h6 fw-bold mb-3" style={{ color: '#667eea' }}>
                📖 דוגמה מעשית:
              </h4>
              <div className="small" style={{ lineHeight: '1.8' }}>
                <p className="mb-2">
                  <strong>תרחיש:</strong> אתה רוצה לקבל <strong>₪500</strong> נטו לכל לילה.
                </p>
                <ul className="mb-0">
                  <li className="mb-2">
                    <strong>באתר הפרטי שלך:</strong> תגדיר מחיר של ₪500 (ללא עמלה)
                  </li>
                  <li className="mb-2">
                    <strong>ב-Airbnb:</strong> תגדיר מחיר של ₪590 
                    <br />
                    <span className="text-muted">→ אחרי שהם יורידו 15.5%, תישאר עם ₪500</span>
                  </li>
                  <li>
                    <strong>ב-Booking.com:</strong> תגדיר מחיר של ₪605
                    <br />
                    <span className="text-muted">→ אחרי כל העמלות, תישאר עם ₪500</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Warning Section */}
            <div 
              className="alert mt-4 mb-0"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 152, 0, 0.1) 100%)',
                border: '2px solid #ffc107',
                borderRadius: '12px',
              }}
            >
              <div className="d-flex align-items-start gap-3">
                <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                <div>
                  <h6 className="fw-bold mb-2" style={{ color: '#ff8f00' }}>
                    שים לב ל-Price Parity (שוויון מחירים)
                  </h6>
                  <p className="mb-0 small text-muted">
                    חלק מהפלטפורמות (כמו Booking.com) דורשות ש"לא יהיה מחיר זול יותר במקום אחר באינטרנט".
                    אם אתה מפר את זה, הם עלולים להוריד את הדירוג שלך או להסיר את הנכס.
                    <strong> המחיר באתר הפרטי שלך צריך להיות שווה או יקר יותר מהמחיר בפלטפורמות.</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default PricingDemoClient
