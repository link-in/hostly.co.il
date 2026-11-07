'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { AlertTriangle, Check, CreditCard, Lock, X } from 'lucide-react'
import DashboardHeader from '@/components/DashboardHeader'
import { Button, PageHeader } from '@/components/ui'

type ModalState = 'idle' | 'loading' | 'open' | 'error'
type PlanId = 'monthly' | 'annual'

const ANNUAL_PRICE = 1000
const MONTHLY_PRICE = 150
const annualMonthly = Math.round(ANNUAL_PRICE / 12)
const annualSaving = MONTHLY_PRICE * 12 - ANNUAL_PRICE

interface PlanDefinition {
  id: PlanId
  title: string
  tagline: string
  price: string
  period: string
  highlight?: string
  features: string[]
}

const PLANS: PlanDefinition[] = [
  {
    id: 'monthly',
    title: 'מנוי חודשי',
    tagline: 'גמישות מלאה — בטל בכל עת',
    price: '₪150',
    period: 'חודש',
    features: ['גישה מלאה לדשבורד', 'ניהול הזמנות ולקוחות', 'בדיקת מחירים ותפוסה', 'שליחת WhatsApp אוטומטי', 'תמיכה בדוא"ל'],
  },
  {
    id: 'annual',
    title: 'מנוי שנתי',
    tagline: 'שלם פעם אחת, חסוך כל השנה',
    price: '₪1,000',
    period: 'שנה',
    highlight: `≈ ₪${annualMonthly}/חודש · חיסכון של ₪${annualSaving}`,
    features: [
      'גישה מלאה לדשבורד',
      'ניהול הזמנות ולקוחות',
      'בדיקת מחירים ותפוסה',
      'שליחת WhatsApp אוטומטי',
      'תמיכה מועדפת',
      'עדיפות בתכונות חדשות',
    ],
  },
]

// ─── Presentational pieces ────────────────────────────────────────────────────

function PlanCard({ plan, selected, onSelect }: { plan: PlanDefinition; selected: boolean; onSelect: () => void }) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      style={{
        position: 'relative',
        background: selected ? 'var(--hb-50)' : 'var(--hsurf)',
        border: `2px solid ${selected ? 'var(--hb)' : 'var(--hborder)'}`,
        borderRadius: 12,
        padding: '28px 24px',
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
        color: 'var(--htxt-1)',
      }}
    >
      {plan.id === 'annual' && (
        <span
          style={{
            position: 'absolute',
            top: -12,
            insetInlineStart: 20,
            background: 'var(--hb)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            padding: '3px 12px',
            borderRadius: 9999,
          }}
        >
          הכי משתלם
        </span>
      )}

      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          marginBottom: 16,
          border: selected ? '6px solid var(--hb)' : '2px solid var(--hborder)',
          background: 'var(--hsurf)',
          transition: 'border 0.15s',
        }}
      />

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{plan.title}</h2>
      <p style={{ fontSize: 13, color: 'var(--htxt-3)', marginBottom: 16 }}>{plan.tagline}</p>

      <div style={{ marginBottom: plan.highlight ? 8 : 20 }}>
        <span style={{ fontSize: 40, fontWeight: 700 }}>{plan.price}</span>
        <span style={{ fontSize: 14, color: 'var(--htxt-3)' }}> / {plan.period}</span>
      </div>

      {plan.highlight && (
        <div
          style={{
            display: 'inline-block',
            background: 'var(--hb-100)',
            color: 'var(--hb)',
            fontSize: 12,
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: 9999,
            marginBottom: 16,
          }}
        >
          {plan.highlight}
        </div>
      )}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {plan.features.map((feature) => (
          <li key={feature} className="d-flex align-items-center gap-2" style={{ marginBottom: 8, fontSize: 14, color: 'var(--htxt-2)' }}>
            <Check size={15} style={{ color: 'var(--hb)', flexShrink: 0 }} />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  )
}

function PaymentModal({ plan, paymentUrl, onClose }: { plan: PlanDefinition; paymentUrl: string; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="תשלום מאובטח"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(15,23,42,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'var(--hsurf)',
          border: '1px solid var(--hborder)',
          borderRadius: 12,
          width: '100%',
          maxWidth: 520,
          boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          className="d-flex align-items-center justify-content-between"
          style={{ padding: '14px 20px', borderBottom: '1px solid var(--hborder-light)' }}
        >
          <div className="d-flex align-items-center gap-2">
            <CreditCard size={20} style={{ color: 'var(--hb)' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--htxt-1)' }}>
                {plan.title} — {plan.price}
              </div>
              <div style={{ fontSize: 12, color: 'var(--htxt-3)' }}>תשלום מאובטח דרך Cardcom</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" iconOnly title="סגור" aria-label="סגור" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        {/* iframe — clip Cardcom header (business name + details section) */}
        <div style={{ overflow: 'hidden', height: 440 }}>
          <iframe
            src={paymentUrl}
            style={{ width: '100%', height: 660, border: 'none', display: 'block', marginTop: -220 }}
            allow="payment"
            title="טופס תשלום מאובטח"
          />
        </div>

        <div
          className="d-flex align-items-center justify-content-center gap-2"
          style={{
            padding: '10px 20px',
            background: 'var(--hsurf-2)',
            borderTop: '1px solid var(--hborder-light)',
            fontSize: 12,
            color: 'var(--htxt-3)',
          }}
        >
          <Lock size={12} />
          החיבור מוצפן ומאובטח — פרטי הכרטיס לא נשמרים אצלנו
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function PricingContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const testToken = searchParams.get('test') ?? undefined
  const isTestMode = !!testToken

  const [selected, setSelected] = useState<PlanId | null>(null)
  const [modal, setModal] = useState<ModalState>('idle')
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [initError, setInitError] = useState<string | null>(null)

  const selectedPlan = PLANS.find((p) => p.id === selected) ?? null

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

  const greeting = session?.user?.displayName ? `שלום ${session.user.displayName} — ` : ''

  return (
    <main dir="rtl" style={{ minHeight: '100vh', background: 'var(--hn-50)' }}>
      <DashboardHeader session={session} currentPage="pricing" />

      <div className="container-fluid py-3 py-md-4 px-3 px-md-4">
        <PageHeader title="בחר את תוכנית המנוי שלך" subtitle={`${greeting}גישה מלאה לכל הכלים לניהול הנכס שלך`} />

        {isTestMode && (
          <div
            className="mb-4 p-3 rounded-2 text-center"
            style={{
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.35)',
              color: '#b45309',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            מצב בדיקה — החיוב יהיה ₪1 בלבד
          </div>
        )}

        <div
          role="radiogroup"
          aria-label="תוכניות מנוי"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: 20,
            maxWidth: 740,
            margin: '0 auto 28px',
          }}
        >
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} selected={selected === plan.id} onSelect={() => setSelected(plan.id)} />
          ))}
        </div>

        {modal === 'error' && initError && (
          <div
            role="alert"
            className="d-flex align-items-center justify-content-center gap-2 mb-3 p-3 rounded-2"
            style={{
              maxWidth: 480,
              margin: '0 auto 16px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#dc2626',
              fontSize: 14,
            }}
          >
            <AlertTriangle size={16} />
            {initError}
          </div>
        )}

        <div className="text-center">
          <Button
            variant="primary"
            size="lg"
            disabled={!selected}
            loading={modal === 'loading'}
            onClick={handleContinue}
            style={{ minWidth: 260 }}
          >
            {modal === 'loading'
              ? 'מכין דף תשלום...'
              : selectedPlan
                ? `המשך לתשלום — ${selectedPlan.price}/${selectedPlan.period}`
                : 'בחר תוכנית להמשך'}
          </Button>

          <div className="d-flex align-items-center justify-content-center gap-2 mt-3" style={{ color: 'var(--htxt-3)', fontSize: 13 }}>
            <Lock size={13} />
            תשלום מאובטח דרך Cardcom
          </div>

          <div className="mt-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              חזור
            </Button>
          </div>
        </div>
      </div>

      {modal === 'open' && paymentUrl && selectedPlan && (
        <PaymentModal plan={selectedPlan} paymentUrl={paymentUrl} onClose={closeModal} />
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
