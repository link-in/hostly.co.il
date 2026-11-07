'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { AlertTriangle, Calculator, Lightbulb } from 'lucide-react'
import DashboardHeader from '@/components/DashboardHeader'
import { Card, PageHeader } from '@/components/ui'

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

const PLATFORMS = {
  direct: {
    multiplier: 1.0,
    displayName: 'אתר פרטי (Direct)',
    commission: '0%',
    explanation: 'אין עמלה - המארח מקבל את כל התשלום',
    color: '#15803d',
  },
  airbnb: {
    multiplier: 1.18,
    displayName: 'Airbnb',
    commission: '15.5%',
    explanation: 'עמלת Airbnb היא 15.5%. כדי שהמארח יקבל את המחיר הנטו, מוסיפים 18%',
    color: '#d93a40',
  },
  booking: {
    multiplier: 1.21,
    displayName: 'Booking.com',
    commission: '~17%',
    explanation: '15% עמלה + מע"מ על העמלה + עמלת סליקה. סה"כ צריך להוסיף 21%',
    color: '#003580',
  },
} as const

const parseNetPrice = (raw: string): number => {
  const parsed = parseFloat(raw)
  return isNaN(parsed) || parsed < 0 ? 0 : parsed
}

// ─── Presentational pieces ────────────────────────────────────────────────────

function Callout({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'brand' | 'warning'
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  const palette =
    tone === 'brand'
      ? { bg: 'var(--hb-50)', border: 'var(--hb-200)', color: 'var(--hb)' }
      : { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.35)', color: '#b45309' }

  return (
    <div className="p-3 rounded-2 d-flex align-items-start gap-3" style={{ background: palette.bg, border: `1px solid ${palette.border}` }}>
      <span style={{ color: palette.color, marginTop: 2 }}>{icon}</span>
      <div>
        <div style={{ color: palette.color, fontWeight: 600, marginBottom: 4 }}>{title}</div>
        <div style={{ color: 'var(--htxt-2)', fontSize: 13.5, lineHeight: 1.6 }}>{children}</div>
      </div>
    </div>
  )
}

function PlatformCard({ platform, netPrice }: { platform: (typeof PLATFORMS)[keyof typeof PLATFORMS]; netPrice: number }) {
  const platformPrice = netPrice * platform.multiplier
  const commissionAmount = platformPrice - netPrice

  return (
    <Card className="h-100" style={{ borderTop: `3px solid ${platform.color}` }}>
      <Card.Body>
        <div style={{ color: platform.color, fontWeight: 700, fontSize: 16, marginBottom: 12 }}>{platform.displayName}</div>

        <div className="text-center py-3 mb-3 rounded-2" style={{ background: 'var(--hn-50)', border: '1px solid var(--hborder-light)' }}>
          <div style={{ color: 'var(--htxt-3)', fontSize: 12.5 }}>מחיר להצגה</div>
          <div style={{ color: 'var(--htxt-1)', fontSize: 32, fontWeight: 700, lineHeight: 1.2 }}>₪{platformPrice.toFixed(0)}</div>
          <div style={{ color: 'var(--htxt-3)', fontSize: 12.5 }}>ללילה</div>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-2" style={{ fontSize: 13.5 }}>
          <span style={{ color: 'var(--htxt-3)' }}>עמלה</span>
          <span style={{ color: 'var(--htxt-1)', fontWeight: 600 }}>
            {platform.commission}
            {commissionAmount > 0 && ` (₪${commissionAmount.toFixed(0)})`}
          </span>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-3" style={{ fontSize: 13.5 }}>
          <span style={{ color: 'var(--htxt-3)' }}>חישוב</span>
          <span dir="ltr" style={{ color: 'var(--htxt-1)', fontFamily: 'monospace' }}>
            ₪{netPrice.toFixed(0)} × {platform.multiplier}
          </span>
        </div>

        <p style={{ color: 'var(--htxt-3)', fontSize: 12.5, lineHeight: 1.6 }}>{platform.explanation}</p>
      </Card.Body>
      <Card.Footer className="justify-content-between">
        <span style={{ color: 'var(--htxt-2)', fontSize: 13, fontWeight: 600 }}>תקבל לכיס</span>
        <span style={{ color: '#15803d', fontWeight: 700, fontSize: 16 }}>₪{netPrice.toFixed(0)}</span>
      </Card.Footer>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PricingDemoClient = () => {
  const { data: session } = useSession()
  const [netPriceInput, setNetPriceInput] = useState<string>('500')
  const netPrice = parseNetPrice(netPriceInput)

  return (
    <main dir="rtl" style={{ minHeight: '100vh', background: 'var(--hn-50)' }}>
      <DashboardHeader session={session} showLandingPageButton={true} currentPage="pricing-demo" />

      <div className="container-fluid py-3 py-md-4 px-3 px-md-4">
        <PageHeader
          title="מחשבון מחירים"
          subtitle="חשב את המחירים הנכונים לכל פלטפורמה כדי להבטיח את הרווח הנטו שלך"
          icon={<Calculator size={20} />}
        />

        <div className="mb-3">
          <Callout tone="brand" icon={<Lightbulb size={20} />} title="למה צריך מחירים שונים?">
            כל פלטפורמה גובה עמלה שונה. כדי שתקבל את אותו סכום נטו לכיס מכל הזמנה, צריך להגדיר מחירים גבוהים יותר בפלטפורמות עם
            עמלות גבוהות יותר.
          </Callout>
        </div>

        <Card padded className="mb-3 hostly-dark-card">
          <label className="form-label mb-1" htmlFor="net-price" style={{ color: 'var(--htxt-2)', fontSize: 13, fontWeight: 600 }}>
            כמה אתה רוצה לקבל נטו לכיס (ללילה)?
          </label>
          <div className="row">
            <div className="col-12 col-md-4">
              <div className="input-group" dir="ltr">
                <span className="input-group-text">₪</span>
                <input
                  id="net-price"
                  type="number"
                  className="form-control"
                  style={{ textAlign: 'right' }}
                  value={netPriceInput}
                  onChange={(e) => setNetPriceInput(e.target.value)}
                  min="0"
                  step="10"
                  placeholder="0"
                />
              </div>
              <div className="mt-1" style={{ color: 'var(--htxt-3)', fontSize: 12.5 }}>
                זה הסכום שתקבל בפועל אחרי ניכוי כל העמלות
              </div>
            </div>
          </div>
        </Card>

        <div className="mb-2" style={{ color: 'var(--htxt-1)', fontWeight: 600, fontSize: 15 }}>
          המחירים שצריך להגדיר בכל פלטפורמה
        </div>
        <div className="row g-3 mb-3">
          {Object.entries(PLATFORMS).map(([key, platform]) => (
            <div key={key} className="col-12 col-md-4">
              <PlatformCard platform={platform} netPrice={netPrice} />
            </div>
          ))}
        </div>

        <Card className="mb-3">
          <Card.Header>דוגמה מעשית</Card.Header>
          <Card.Body style={{ fontSize: 13.5, lineHeight: 1.8, color: 'var(--htxt-2)' }}>
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
                <span style={{ color: 'var(--htxt-3)' }}>→ אחרי שהם יורידו 15.5%, תישאר עם ₪500</span>
              </li>
              <li>
                <strong>ב-Booking.com:</strong> תגדיר מחיר של ₪605
                <br />
                <span style={{ color: 'var(--htxt-3)' }}>→ אחרי כל העמלות, תישאר עם ₪500</span>
              </li>
            </ul>
          </Card.Body>
        </Card>

        <Callout tone="warning" icon={<AlertTriangle size={20} />} title="שים לב ל-Price Parity (שוויון מחירים)">
          חלק מהפלטפורמות (כמו Booking.com) דורשות ש&quot;לא יהיה מחיר זול יותר במקום אחר באינטרנט&quot;. אם אתה מפר את זה, הם עלולים
          להוריד את הדירוג שלך או להסיר את הנכס.
          <strong> המחיר באתר הפרטי שלך צריך להיות שווה או יקר יותר מהמחיר בפלטפורמות.</strong>
        </Callout>
      </div>
    </main>
  )
}

export default PricingDemoClient
