'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Clock } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()

  return (
    <main
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '480px', textAlign: 'center' }}>
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            padding: '48px 36px',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              border: '2px solid #bfdbfe',
            }}
          >
            <Clock size={32} style={{ color: '#1d4ed8' }} />
          </div>

          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: '0 0 12px',
            }}
          >
            החשבון שלך נוצר בהצלחה
          </h1>

          <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: 1.6, margin: '0 0 28px' }}>
            צוות Hostly יסיים את הגדרת החשבון שלך תוך זמן קצר.
            <br />
            תקבל עדכון ברגע שהכל מוכן.
          </p>

          <button
            onClick={() => router.push('/dashboard')}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            כניסה לדשבורד
          </button>
        </div>
      </div>
    </main>
  )
}
