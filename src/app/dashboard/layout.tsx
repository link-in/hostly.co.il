import { Suspense } from 'react'
import { SessionProvider } from './SessionProvider'
import { RoomProvider } from '@/lib/rooms/RoomContext'
import SubscriptionBanner from '@/components/SubscriptionBanner'
import DashboardSidebar from '@/components/DashboardSidebar'
import type { ReactNode } from 'react'
import './dashboard-surfaces.css'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Suspense>
        <RoomProvider>
          <div className="hostly-layout-root" dir="rtl">
            {/* Persistent sidebar — desktop only (hidden on mobile via CSS) */}
            <DashboardSidebar />

            {/* Main content area — offset right on desktop */}
            <div className="hostly-main-panel">
              <SubscriptionBanner />
              {children}
            </div>
          </div>
        </RoomProvider>
      </Suspense>
    </SessionProvider>
  )
}
