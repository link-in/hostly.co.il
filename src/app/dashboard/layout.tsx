import { Suspense } from 'react'
import { SessionProvider } from './SessionProvider'
import { RoomProvider } from '@/lib/rooms/RoomContext'
import SubscriptionBanner from '@/components/SubscriptionBanner'
import type { ReactNode } from 'react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Suspense>
        <RoomProvider>
          <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)' }}>
            <SubscriptionBanner />
            {children}
          </div>
        </RoomProvider>
      </Suspense>
    </SessionProvider>
  )
}
