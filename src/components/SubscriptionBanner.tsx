'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import type { SubscriptionStatus } from '@/lib/auth/types'

interface SubscriptionInfo {
  status: SubscriptionStatus
  daysRemaining: number
  expiresAt: string | null
  planId: string | null
  wasActive?: boolean
}

export default function SubscriptionBanner() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [sub, setSub] = useState<SubscriptionInfo | null>(null)
  const [navigating, setNavigating] = useState(false)

  useEffect(() => {
    if (!session?.user) return
    // Skip for demo and admin users
    if (session.user.isDemo || session.user.role === 'admin') return

    fetch('/api/dashboard/subscription')
      .then((r) => r.json())
      .then((data) => setSub(data))
      .catch(() => null)
  }, [session])

  if (!sub) return null
  if (navigating) return null
  if (session?.user?.isDemo || session?.user?.role === 'admin') return null
  if (pathname?.startsWith('/dashboard/pricing')) return null

  // Active paid subscription — no banner
  if (sub.status === 'active') return null

  // Trial banner
  if (sub.status === 'trial') {
    const days = sub.daysRemaining
    if (days <= 0) return null // will show expired banner instead via status change
    const isUrgent = days <= 3

    return (
      <div
        dir="rtl"
        style={{
          background: isUrgent
            ? 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)'
            : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          border: `1px solid ${isUrgent ? '#fed7aa' : '#bfdbfe'}`,
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>{isUrgent ? '⚠️' : '🎯'}</span>
          <div>
            <p style={{ margin: 0, fontWeight: '600', color: isUrgent ? '#9a3412' : '#1e40af', fontSize: '14px' }}>
              {isUrgent
                ? `נשארו רק ${days} ימים לתקופת הניסיון שלך`
                : `תקופת הניסיון שלך — נשארו ${days} ימים`}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: isUrgent ? '#c2410c' : '#3b82f6' }}>
              מנוי חודשי: ₪150 | מנוי שנתי: ₪1,000
            </p>
          </div>
        </div>
        <a
          href="/dashboard/pricing"
          style={{
            background: isUrgent
              ? 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)'
              : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          שדרג עכשיו
        </a>
      </div>
    )
  }

  // Cancelled — only show banner if still has some access remaining
  if (sub.status === 'cancelled' && sub.daysRemaining > 0) {
    return (
      <div
        dir="rtl"
        style={{
          background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
          border: '1px solid #fde047',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>📋</span>
          <p style={{ margin: 0, fontWeight: '600', color: '#854d0e', fontSize: '14px' }}>
            המנוי שלך בוטל — הגישה תפוג בעוד {sub.daysRemaining} ימים
          </p>
        </div>
        <a
          href="/dashboard/pricing"
          style={{
            background: 'linear-gradient(135deg, #ca8a04 0%, #a16207 100%)',
            color: 'white',
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          חדש מנוי
        </a>
      </div>
    )
  }

  // Expired or cancelled-with-no-access — full block screen
  if (sub.status === 'expired' || (sub.status === 'cancelled' && sub.daysRemaining <= 0)) {
    const hadPaidPlan = sub.wasActive || sub.planId != null
    return (
      <div
        dir="rtl"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        <div
          style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px 36px',
            maxWidth: '460px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
          }}
        >
          <div style={{ fontSize: '52px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', marginBottom: '10px' }}>
            {hadPaidPlan ? 'המנוי שלך הסתיים' : 'תקופת הניסיון הסתיימה'}
          </h2>
          <p style={{ color: '#6b7280', fontSize: '15px', marginBottom: '28px', lineHeight: '1.6' }}>
            {hadPaidPlan
              ? 'כדי להמשיך להשתמש ב-Hostly, חדש את המנוי שלך.'
              : 'כדי להמשיך להשתמש ב-Hostly, בחר תוכנית מנוי.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setNavigating(true)
                router.push('/dashboard/pricing')
              }}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '13px 28px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.35)',
              }}
            >
              {hadPaidPlan ? 'חדש מנוי' : 'צפה בתוכניות'}
            </button>
          </div>
          <p style={{ marginTop: '20px', fontSize: '13px', color: '#9ca3af' }}>
            שאלות? צור קשר:{' '}
            <a href="mailto:support@hostly.co.il" style={{ color: '#667eea' }}>
              support@hostly.co.il
            </a>
          </p>
        </div>
      </div>
    )
  }

  return null
}
