import { Suspense } from 'react'
import { SessionProvider } from './SessionProvider'
import { RoomProvider } from '@/lib/rooms/RoomContext'
import SubscriptionBanner from '@/components/SubscriptionBanner'
import Beds24SuspendedBanner from '@/components/Beds24SuspendedBanner'
import DashboardSidebar from '@/components/DashboardSidebar'
import { Beds24StatusProvider } from '@/lib/beds24/Beds24StatusContext'
import type { ReactNode } from 'react'
import './dashboard-surfaces.css'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Suspense>
        <RoomProvider>
          <Beds24StatusProvider>
            <div className="hostly-layout-root" dir="rtl">
              {/* Persistent sidebar — desktop only (hidden on mobile via CSS) */}
              <DashboardSidebar />

              {/* Main content area — offset right on desktop */}
              <div className="hostly-main-panel">
                <SubscriptionBanner />
                {/* Beds24 credit exhaustion warning — renders only when suspended */}
                <Beds24SuspendedBannerConnected />
                {children}
              </div>
            </div>
          </Beds24StatusProvider>
        </RoomProvider>
      </Suspense>
    </SessionProvider>
  )
}

// Wrapper so the banner can call the context setter
// (layout is a server component, so we need a tiny client bridge)
import BannerConnector from '@/components/Beds24BannerConnector'
function Beds24SuspendedBannerConnected() {
  return <BannerConnector />
}
