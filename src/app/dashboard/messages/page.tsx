'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BellRing, History, MessageSquare, Star } from 'lucide-react'
import DashboardHeader from '@/components/DashboardHeader'
import DashboardLoader from '@/components/DashboardLoader'
import { PageHeader } from '@/components/ui'
import ArrivalMessageSection from './components/ArrivalMessageSection'
import ReviewReminderSection from './components/ReviewReminderSection'
import MessageLogsSection from './components/MessageLogsSection'

export type WhatsAppTab = 'arrival' | 'review' | 'logs'

interface TabOption {
  id: WhatsAppTab
  labelDesktop: string
  labelMobile: string
  icon: typeof BellRing
  description: string
}

const TABS: TabOption[] = [
  {
    id: 'arrival',
    labelDesktop: 'הודעת יום הגעה',
    labelMobile: 'יום הגעה',
    icon: BellRing,
    description: 'הודעה אוטומטית שנשלחת בבוקר הצ\'ק-אין עם פרטי הנכס, תמונה ו-Waze',
  },
  {
    id: 'review',
    labelDesktop: 'הודעת ביקורת (צ\'ק-אאוט)',
    labelMobile: 'ביקורת',
    icon: Star,
    description: 'הודעת תודה ובקשת ביקורת שנשלחת בבוקר שאחרי הצ\'ק-אאוט',
  },
  {
    id: 'logs',
    labelDesktop: 'יומן שליחות',
    labelMobile: 'יומן',
    icon: History,
    description: 'מעקב בזמן אמת אחר כל ההודעות שנשלחו, נמסרו או נכשלו',
  },
]

export default function WhatsAppMessagesPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<WhatsAppTab>('arrival')

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login')
    }
  }, [authStatus, router])

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'arrival' || tabParam === 'review' || tabParam === 'logs') {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  const handleTabChange = (tabId: WhatsAppTab) => {
    setActiveTab(tabId)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tabId)
    window.history.replaceState({}, '', url.toString())
  }

  if (authStatus === 'loading') {
    return (
      <main dir="rtl" style={{ minHeight: '100vh', background: 'var(--hn-50)' }}>
        <DashboardHeader session={session} currentPage="messages" />
        <div className="container py-3 py-md-4">
          <DashboardLoader variant="section" label="טוען עמוד הודעות…" minHeight={280} />
        </div>
      </main>
    )
  }

  if (!session?.user) {
    return null
  }

  const currentTab = TABS.find((t) => t.id === activeTab) || TABS[0]

  return (
    <main dir="rtl" style={{ minHeight: '100vh', background: 'var(--hn-50)' }}>
      {/* Mobile bottom nav & drawer */}
      <DashboardHeader
        session={session}
        currentPage="messages"
        showLandingPageButton={true}
      />

      <div className="container py-3 py-md-4">
        {/* כותרת ראשית של העמוד */}
        <div className="mb-4">
          <PageHeader
            title="הודעות WhatsApp"
            subtitle={currentTab.description}
            icon={<MessageSquare size={22} />}
          />
        </div>

        {/* מתג מקטעים (Segmented Tabs Control) מותאם למובייל ולדסקטופ ללא אמוג'ים */}
        <div
          role="tablist"
          aria-label="מקטעי הודעות WhatsApp"
          className="whatsapp-tabs-container mb-4"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                type="button"
                className={`whatsapp-tab-item ${isActive ? 'whatsapp-tab-item--active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                <Icon size={16} className="whatsapp-tab-icon" />
                <span className="whatsapp-tab-label-desktop">{tab.labelDesktop}</span>
                <span className="whatsapp-tab-label-mobile">{tab.labelMobile}</span>
              </button>
            )
          })}
        </div>

        {/* תוכן הטאב הנבחר */}
        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="whatsapp-tab-content-panel"
        >
          {activeTab === 'arrival' && <ArrivalMessageSection />}
          {activeTab === 'review' && <ReviewReminderSection />}
          {activeTab === 'logs' && <MessageLogsSection />}
        </div>
      </div>

      <style jsx global>{`
        .whatsapp-tabs-container {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #e9eff5;
          padding: 5px;
          border-radius: 12px;
          width: 100%;
          max-width: 640px;
          border: 1px solid var(--hborder);
        }

        .whatsapp-tab-item {
          flex: 1 1 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 9px 12px;
          min-height: 42px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--htxt-2);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.18s ease-in-out;
          white-space: nowrap;
          outline: none;
          user-select: none;
        }

        .whatsapp-tab-item:hover:not(.whatsapp-tab-item--active) {
          color: var(--htxt-1);
          background: rgba(255, 255, 255, 0.45);
        }

        .whatsapp-tab-item:focus-visible {
          box-shadow: 0 0 0 2px var(--hb);
        }

        .whatsapp-tab-item--active {
          background: #ffffff;
          color: var(--hb);
          font-weight: 700;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.04);
        }

        .whatsapp-tab-icon {
          flex-shrink: 0;
          color: inherit;
        }

        .whatsapp-tab-label-desktop {
          display: inline;
        }

        .whatsapp-tab-label-mobile {
          display: none;
        }

        @media (max-width: 576px) {
          .whatsapp-tabs-container {
            max-width: 100%;
            gap: 4px;
            padding: 4px;
          }

          .whatsapp-tab-item {
            padding: 8px 6px;
            gap: 6px;
            font-size: 13.5px;
            min-height: 40px;
          }

          .whatsapp-tab-label-desktop {
            display: none;
          }

          .whatsapp-tab-label-mobile {
            display: inline;
          }
        }

        .whatsapp-tab-content-panel {
          animation: hostlyFadeIn 0.2s ease-in-out;
        }

        @keyframes hostlyFadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  )
}
