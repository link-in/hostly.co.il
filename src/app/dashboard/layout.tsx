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
          <SubscriptionBanner />
          {children}
        </RoomProvider>
      </Suspense>
    </SessionProvider>
  )
}
