'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import DashboardHeader from '@/components/DashboardHeader'
import DashboardLoader from '@/components/DashboardLoader'
import { PageHeader } from '@/components/ui'
import ArrivalMessageSection from './components/ArrivalMessageSection'
import ReviewReminderSection from './components/ReviewReminderSection'
import MessageLogsSection from './components/MessageLogsSection'

export default function WhatsAppMessagesPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login')
    }
  }, [authStatus, router])

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
            subtitle="ניהול הודעות יום הגעה, בקשות ביקורת ויומן שליחות"
            icon={<MessageSquare size={22} />}
          />
        </div>

        {/* 1. קודם כל מה שקשור להודעת יום הגעה */}
        <ArrivalMessageSection />

        {/* 2. אחרי זה הודעת ביקורת אחרי צ'ק-אאוט */}
        <ReviewReminderSection />

        {/* 3. ובסוף את היומן שליחות */}
        <MessageLogsSection />
      </div>
    </main>
  )
}
