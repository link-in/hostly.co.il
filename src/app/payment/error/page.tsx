'use client'

import { useRouter } from 'next/navigation'

export default function PaymentErrorPage() {
  const router = useRouter()

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', direction: 'rtl',
    }}>
      <div style={{
        background: 'white', borderRadius: '24px',
        padding: '48px 40px', maxWidth: '420px', width: '100%',
        textAlign: 'center', boxShadow: '0 30px 80px rgba(0,0,0,0.2)',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#dc2626', marginBottom: '10px' }}>
          התשלום נכשל
        </h2>
        <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.6', marginBottom: '28px' }}>
          לא בוצע חיוב בחשבונך. ייתכן שפרטי הכרטיס שגויים או שהכרטיס נחסם.
          <br /><br />
          נסה שנית עם כרטיס אחר או פנה לתמיכה.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => router.push('/dashboard/pricing')}
            style={{
              background: 'linear-gradient(135deg,#667eea,#764ba2)',
              color: 'white', border: 'none', borderRadius: '12px',
              padding: '13px 0', fontSize: '15px', fontWeight: '700',
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
              padding: '13px 0', fontSize: '15px', fontWeight: '600',
              cursor: 'pointer', flex: 1,
            }}
          >
            לדשבורד
          </button>
        </div>
        <p style={{ marginTop: '20px', fontSize: '12px', color: '#9ca3af' }}>
          תמיכה:{' '}
          <a href="mailto:support@hostly.co.il" style={{ color: '#667eea' }}>
            support@hostly.co.il
          </a>
        </p>
      </div>
    </main>
  )
}
