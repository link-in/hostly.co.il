'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get('id')
  const [status, setStatus] = useState<'checking' | 'paid' | 'failed' | 'timeout'>('checking')
  const [planId, setPlanId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) { setStatus('failed'); return }

    let attempts = 0
    const maxAttempts = 12 // 12 × 2.5s = 30s max

    const poll = async () => {
      try {
        const res = await fetch(`/api/payment/subscription/verify?id=${id}`)
        if (res.status === 202) {
          // Still pending — retry
          attempts++
          if (attempts < maxAttempts) {
            setTimeout(poll, 2500)
          } else {
            setStatus('timeout')
          }
          return
        }
        const data = await res.json()
        if (data.status === 'paid') {
          setPlanId(data.planId)
          setStatus('paid')
        } else {
          setStatus('failed')
        }
      } catch {
        attempts++
        if (attempts < maxAttempts) setTimeout(poll, 2500)
        else setStatus('timeout')
      }
    }

    // Give webhook a head-start before first poll
    setTimeout(poll, 1500)
  }, [id])

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', direction: 'rtl',
    }}>
      <div style={{
        background: 'white', borderRadius: '24px',
        padding: '48px 40px', maxWidth: '440px', width: '100%',
        textAlign: 'center', boxShadow: '0 30px 80px rgba(0,0,0,0.2)',
      }}>
        {status === 'checking' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1e1b4b', marginBottom: '10px' }}>
              מאמת את התשלום...
            </h2>
            <p style={{ color: '#6b7280', fontSize: '15px' }}>
              אנחנו בודקים את אישור התשלום, זה ייקח רגע.
            </p>
            <div style={{
              width: '40px', height: '40px', border: '4px solid #e5e7eb',
              borderTopColor: '#667eea', borderRadius: '50%',
              margin: '24px auto 0',
              animation: 'spin 0.9s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </>
        )}

        {status === 'paid' && (
          <>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#059669', marginBottom: '10px' }}>
              התשלום התקבל!
            </h2>
            <p style={{ color: '#374151', fontSize: '15px', lineHeight: '1.6', marginBottom: '28px' }}>
              המנוי {planId === 'annual' ? 'השנתי' : 'החודשי'} שלך הופעל בהצלחה.
              <br />ברוך הבא ל-Hostly Pro! 🚀
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white', border: 'none', borderRadius: '12px',
                padding: '13px 32px', fontSize: '15px', fontWeight: '700',
                cursor: 'pointer', width: '100%',
              }}
            >
              עבור לדשבורד
            </button>
          </>
        )}

        {(status === 'failed' || status === 'timeout') && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#dc2626', marginBottom: '10px' }}>
              {status === 'timeout' ? 'בדיקה ממושכת' : 'אירעה שגיאה'}
            </h2>
            <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              {status === 'timeout'
                ? 'האימות לוקח יותר זמן מהצפוי. אם בוצע חיוב — המנוי יופעל תוך מספר דקות. אם לא — נסה שנית.'
                : 'לא הצלחנו לאמת את התשלום. אנא נסה שנית.'}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => router.push('/dashboard/pricing')}
                style={{
                  background: 'linear-gradient(135deg,#667eea,#764ba2)',
                  color: 'white', border: 'none', borderRadius: '12px',
                  padding: '12px 0', fontSize: '14px', fontWeight: '700',
                  cursor: 'pointer', flex: 1,
                }}
              >
                נסה שנית
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                style={{
                  background: 'white', color: '#667eea',
                  border: '1px solid #667eea', borderRadius: '12px',
                  padding: '12px 0', fontSize: '14px', fontWeight: '600',
                  cursor: 'pointer', flex: 1,
                }}
              >
                לדשבורד
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
