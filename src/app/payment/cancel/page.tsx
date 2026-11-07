'use client'

import { useRouter } from 'next/navigation'

export default function PaymentCancelPage() {
  const router = useRouter()

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--hn-50)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', direction: 'rtl',
    }}>
      <div style={{
        background: 'white', borderRadius: '12px',
        padding: '48px 40px', maxWidth: '420px', width: '100%',
        textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', border: '1px solid var(--hborder)',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>↩️</div>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1e1b4b', marginBottom: '10px' }}>
          התשלום בוטל
        </h2>
        <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.6', marginBottom: '28px' }}>
          לא בוצע חיוב. תוכל לחזור ולבחור תוכנית בכל עת.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => router.push('/dashboard/pricing')}
            style={{
              background: 'var(--hb)',
              color: 'white', border: 'none', borderRadius: '12px',
              padding: '13px 0', fontSize: '15px', fontWeight: '700',
              cursor: 'pointer', flex: 1,
            }}
          >
            חזור לבחירת תוכנית
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              background: 'white', color: 'var(--hb)',
              border: '1px solid var(--hb)', borderRadius: '12px',
              padding: '13px 0', fontSize: '15px', fontWeight: '600',
              cursor: 'pointer', flex: 1,
            }}
          >
            לדשבורד
          </button>
        </div>
      </div>
    </main>
  )
}
