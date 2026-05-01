'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import DashboardHeader from '@/components/DashboardHeader'

type ModalState = 'idle' | 'loading' | 'open' | 'error'

function PricingContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const testToken = searchParams.get('test') ?? undefined
  const isTestMode = !!testToken

  const [selected, setSelected] = useState<'monthly' | 'annual' | null>(null)
  const [modal, setModal] = useState<ModalState>('idle')
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [initError, setInitError] = useState<string | null>(null)

  const annualMonthly = Math.round(1000 / 12)
  const annualSaving = 150 * 12 - 1000

  const handleContinue = async () => {
    if (!selected) return
    setModal('loading')
    setInitError(null)

    try {
      const res = await fetch('/api/payment/subscription/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selected, ...(testToken ? { testToken } : {}) }),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'שגיאה ביצירת דף תשלום')
      }

      const { paymentUrl: url, uniqueId } = await res.json()
      setPaymentUrl(url)
      setPaymentId(uniqueId)
      setModal('open')
    } catch (err) {
      setInitError(err instanceof Error ? err.message : 'שגיאה בהתחברות לשירות התשלום')
      setModal('error')
    }
  }

  const closeModal = () => {
    setModal('idle')
    setPaymentUrl(null)
    setPaymentId(null)
  }

  return (
    <main
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      }}
    >
      <div className="container py-3 py-md-4">
        <div className="mb-3 mb-md-4">
          <DashboardHeader session={session} currentPage="pricing" />
        </div>

        {/* Test mode banner */}
        {isTestMode && (
          <div style={{
            background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.6)',
            borderRadius: '10px', padding: '10px 16px', marginBottom: '20px',
            textAlign: 'center', color: 'white', fontSize: '14px', fontWeight: '600',
          }}>
            🧪 מצב בדיקה — החיוב יהיה ₪1 בלבד
          </div>
        )}

        {/* Page title */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h1 style={{
            fontSize: '28px', fontWeight: '800', color: 'white',
            marginBottom: '8px', textShadow: '0 2px 12px rgba(0,0,0,0.15)',
          }}>
            בחר את תוכנית המנוי שלך
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '15px' }}>
            {session?.user?.name ? `שלום ${session.user.name} — ` : ''}
            גישה מלאה לכל הכלים לניהול הנכס שלך
          </p>
        </div>

        {/* Plans */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '20px',
          maxWidth: '740px',
          margin: '0 auto 32px',
        }}>
          {/* Monthly */}
          <div
            onClick={() => setSelected('monthly')}
            style={{
              background: selected === 'monthly' ? 'white' : 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)',
              borderRadius: '20px',
              padding: '32px 28px',
              cursor: 'pointer',
              border: selected === 'monthly' ? '2px solid white' : '2px solid rgba(255,255,255,0.3)',
              boxShadow: selected === 'monthly' ? '0 12px 40px rgba(0,0,0,0.18)' : '0 4px 16px rgba(0,0,0,0.1)',
              transition: 'all 0.25s ease',
              color: selected === 'monthly' ? '#1e1b4b' : 'white',
            }}
          >
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%',
              border: selected === 'monthly' ? '6px solid #667eea' : '2px solid rgba(255,255,255,0.6)',
              marginBottom: '20px', transition: 'all 0.2s',
            }} />
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>מנוי חודשי</h2>
            <p style={{ fontSize: '13px', marginBottom: '20px', color: selected === 'monthly' ? '#6b7280' : 'rgba(255,255,255,0.75)' }}>
              גמישות מלאה — בטל בכל עת
            </p>
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '44px', fontWeight: '800' }}>₪150</span>
              <span style={{ fontSize: '14px', color: selected === 'monthly' ? '#9ca3af' : 'rgba(255,255,255,0.7)' }}> / חודש</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['גישה מלאה לדשבורד', 'ניהול הזמנות ולקוחות', 'בדיקת מחירים ותפוסה', 'שליחת WhatsApp אוטומטי', 'תמיכה בדוא"ל'].map((f) => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '9px', fontSize: '14px' }}>
                  <span style={{ color: selected === 'monthly' ? '#667eea' : 'rgba(255,255,255,0.9)', fontWeight: '700', fontSize: '15px' }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Annual */}
          <div
            onClick={() => setSelected('annual')}
            style={{
              background: selected === 'annual' ? 'white' : 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)',
              borderRadius: '20px',
              padding: '32px 28px',
              cursor: 'pointer',
              border: selected === 'annual' ? '2px solid white' : '2px solid rgba(255,255,255,0.3)',
              boxShadow: selected === 'annual' ? '0 12px 40px rgba(0,0,0,0.18)' : '0 4px 16px rgba(0,0,0,0.1)',
              transition: 'all 0.25s ease',
              position: 'relative',
              color: selected === 'annual' ? '#1e1b4b' : 'white',
            }}
          >
            <div style={{
              position: 'absolute', top: '-14px', right: '24px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white', fontSize: '12px', fontWeight: '700',
              padding: '4px 14px', borderRadius: '20px',
              boxShadow: '0 3px 10px rgba(217,119,6,0.4)',
            }}>
              ✨ הכי משתלם
            </div>
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%',
              border: selected === 'annual' ? '6px solid #764ba2' : '2px solid rgba(255,255,255,0.6)',
              marginBottom: '20px', transition: 'all 0.2s',
            }} />
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>מנוי שנתי</h2>
            <p style={{ fontSize: '13px', marginBottom: '20px', color: selected === 'annual' ? '#6b7280' : 'rgba(255,255,255,0.75)' }}>
              שלם פעם אחת, חסוך כל השנה
            </p>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ fontSize: '44px', fontWeight: '800' }}>₪1,000</span>
              <span style={{ fontSize: '14px', color: selected === 'annual' ? '#9ca3af' : 'rgba(255,255,255,0.7)' }}> / שנה</span>
            </div>
            <div style={{
              display: 'inline-block',
              background: selected === 'annual' ? 'linear-gradient(135deg,#667eea,#764ba2)' : 'rgba(255,255,255,0.2)',
              color: selected === 'annual' ? 'white' : 'rgba(255,255,255,0.95)',
              fontSize: '12px', fontWeight: '700', padding: '3px 10px',
              borderRadius: '20px', marginBottom: '20px',
            }}>
              ≈ ₪{annualMonthly}/חודש · חיסכון של ₪{annualSaving}
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['גישה מלאה לדשבורד', 'ניהול הזמנות ולקוחות', 'בדיקת מחירים ותפוסה', 'שליחת WhatsApp אוטומטי', 'תמיכה מועדפת', 'עדיפות בתכונות חדשות'].map((f) => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '9px', fontSize: '14px' }}>
                  <span style={{ color: selected === 'annual' ? '#764ba2' : 'rgba(255,255,255,0.9)', fontWeight: '700', fontSize: '15px' }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Error message */}
        {modal === 'error' && initError && (
          <div style={{
            maxWidth: '480px', margin: '0 auto 20px',
            background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)',
            borderRadius: '12px', padding: '12px 16px',
            color: 'white', textAlign: 'center', fontSize: '14px',
          }}>
            ⚠️ {initError}
          </div>
        )}

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleContinue}
            disabled={!selected || modal === 'loading'}
            style={{
              background: selected ? 'white' : 'rgba(255,255,255,0.25)',
              color: selected ? '#764ba2' : 'rgba(255,255,255,0.6)',
              border: 'none', borderRadius: '14px',
              padding: '15px 52px', fontSize: '16px', fontWeight: '800',
              cursor: selected && modal !== 'loading' ? 'pointer' : 'default',
              boxShadow: selected ? '0 6px 24px rgba(0,0,0,0.15)' : 'none',
              transition: 'all 0.2s', minWidth: '240px',
            }}
          >
            {modal === 'loading'
              ? '⏳ מכין דף תשלום...'
              : selected
                ? `המשך לתשלום — ${selected === 'monthly' ? '₪150/חודש' : '₪1,000/שנה'}`
                : 'בחר תוכנית להמשך'}
          </button>

          <div style={{ marginTop: '14px', color: 'rgba(255,255,255,0.65)', fontSize: '13px' }}>
            🔒 תשלום מאובטח דרך Cardcom
          </div>

          <button
            onClick={() => router.back()}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.55)', fontSize: '13px',
              cursor: 'pointer', marginTop: '10px', textDecoration: 'underline',
            }}
          >
            חזור
          </button>
        </div>

        <div style={{ height: '48px' }} />
      </div>

      {/* ── Payment Modal ────────────────────────────────────── */}
      {modal === 'open' && paymentUrl && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div style={{
            background: 'white', borderRadius: '20px',
            width: '100%', maxWidth: '520px',
            boxShadow: '0 30px 80px rgba(0,0,0,0.3)',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Modal header */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '16px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ color: 'white' }}>
                <div style={{ fontWeight: '700', fontSize: '16px' }}>
                  💳 {selected === 'monthly' ? 'מנוי חודשי — ₪150' : 'מנוי שנתי — ₪1,000'}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>
                  תשלום מאובטח דרך Cardcom
                </div>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: 'rgba(255,255,255,0.2)', border: 'none',
                  borderRadius: '50%', width: '32px', height: '32px',
                  color: 'white', fontSize: '18px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1,
                }}
                title="סגור"
              >
                ×
              </button>
            </div>

            {/* iframe — clip Cardcom header (business name + details section) */}
            <div style={{ overflow: 'hidden', height: '440px' }}>
              <iframe
                src={paymentUrl}
                style={{
                  width: '100%',
                  height: '660px',
                  border: 'none',
                  display: 'block',
                  marginTop: '-220px',
                }}
                allow="payment"
                title="טופס תשלום מאובטח"
              />
            </div>

            {/* Footer */}
            <div style={{
              padding: '10px 20px',
              background: '#f8faff',
              borderTop: '1px solid #e5e7eb',
              textAlign: 'center',
              fontSize: '12px', color: '#9ca3af',
            }}>
              🔒 החיבור מוצפן ומאובטח — פרטי הכרטיס לא נשמרים אצלנו
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default function PricingClient() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  )
}
