'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, Suspense } from 'react'

function MockCheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get('id')
  const amount = searchParams.get('amount')
  const plan = searchParams.get('plan')
  const successUrl = searchParams.get('successUrl') ?? '/payment/success'
  const cancelUrl = searchParams.get('cancelUrl') ?? '/payment/cancel'

  const [loading, setLoading] = useState(false)

  const handlePay = async () => {
    if (!id) return
    setLoading(true)
    try {
      await fetch(`/api/payment/subscription/mock-confirm?id=${id}`, { method: 'POST' })
      // Navigate the TOP frame (parent), not just the iframe
      if (window.top && window.top !== window) {
        window.top.location.href = successUrl
      } else {
        router.push(successUrl)
      }
    } catch {
      setLoading(false)
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#f3f4f6',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', direction: 'rtl', fontFamily: 'sans-serif',
    }}>
      <div style={{
        background: 'white', borderRadius: '16px',
        padding: '40px 36px', maxWidth: '400px', width: '100%',
        boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
      }}>
        {/* DEV badge */}
        <div style={{
          background: '#fef9c3', border: '1px solid #fde047',
          borderRadius: '8px', padding: '8px 12px',
          fontSize: '12px', color: '#854d0e', marginBottom: '24px',
          textAlign: 'center', fontWeight: '600',
        }}>
          🛠️ מצב פיתוח — MOCK CHECKOUT (אין חיוב אמיתי)
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '20px' }}>
          סיכום הזמנה
        </h2>

        <div style={{
          background: '#f8faff', border: '1px solid #e0e7ff',
          borderRadius: '10px', padding: '16px', marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#6b7280', fontSize: '14px' }}>תוכנית</span>
            <span style={{ fontWeight: '600', fontSize: '14px' }}>
              {plan === 'annual' ? 'מנוי שנתי' : 'מנוי חודשי'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280', fontSize: '14px' }}>סכום</span>
            <span style={{ fontWeight: '700', fontSize: '18px', color: '#667eea' }}>
              ₪{amount}
            </span>
          </div>
        </div>

        {/* Mock card fields */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
            מספר כרטיס
          </label>
          <input
            type="text"
            defaultValue="4580280000000008"
            readOnly
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '8px',
              border: '1px solid #d1d5db', fontSize: '14px',
              background: '#f9fafb', color: '#6b7280', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
              תוקף
            </label>
            <input type="text" defaultValue="12/30" readOnly
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', background: '#f9fafb', color: '#6b7280', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
              CVV
            </label>
            <input type="text" defaultValue="123" readOnly
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', background: '#f9fafb', color: '#6b7280', boxSizing: 'border-box' }} />
          </div>
        </div>

        <button
          onClick={handlePay}
          disabled={loading}
          style={{
            width: '100%', background: 'linear-gradient(135deg,#667eea,#764ba2)',
            color: 'white', border: 'none', borderRadius: '10px',
            padding: '14px', fontSize: '15px', fontWeight: '700',
            cursor: loading ? 'default' : 'pointer', marginBottom: '10px',
          }}
        >
          {loading ? 'מעבד...' : `✅ סמלץ תשלום מוצלח — ₪${amount}`}
        </button>

        <button
          onClick={() => {
            if (window.top && window.top !== window) {
              window.top.location.href = cancelUrl
            } else {
              router.push(cancelUrl)
            }
          }}
          style={{
            width: '100%', background: 'none', border: '1px solid #e5e7eb',
            borderRadius: '10px', padding: '12px', fontSize: '14px',
            color: '#6b7280', cursor: 'pointer',
          }}
        >
          ביטול
        </button>
      </div>
    </main>
  )
}

export default function MockCheckoutPage() {
  return (
    <Suspense>
      <MockCheckoutContent />
    </Suspense>
  )
}
