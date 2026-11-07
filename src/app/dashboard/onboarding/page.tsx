'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Clock } from 'lucide-react'
import { Button, Card } from '@/components/ui'

export default function OnboardingPage() {
  const router = useRouter()

  return (
    <main
      dir="rtl"
      className="d-flex align-items-center justify-content-center p-3"
      style={{ minHeight: '100vh', background: 'var(--hn-50)' }}
    >
      <div style={{ width: '100%', maxWidth: 480 }}>
        <Card shadow className="text-center" style={{ padding: '44px 32px' }}>
          <div
            className="d-flex align-items-center justify-content-center mx-auto mb-4"
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--hb-100)',
              border: '1px solid var(--hb-200)',
              color: 'var(--hb)',
            }}
          >
            <Clock size={28} />
          </div>

          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--htxt-1)', margin: '0 0 12px' }}>
            החשבון שלך נוצר בהצלחה
          </h1>

          <p style={{ color: 'var(--htxt-3)', fontSize: 15, lineHeight: 1.6, margin: '0 0 28px' }}>
            צוות Hostly יסיים את הגדרת החשבון שלך תוך זמן קצר.
            <br />
            תקבל עדכון ברגע שהכל מוכן.
          </p>

          <Button variant="primary" size="lg" className="w-100" onClick={() => router.push('/dashboard')}>
            כניסה לדשבורד
          </Button>
        </Card>
      </div>
    </main>
  )
}
