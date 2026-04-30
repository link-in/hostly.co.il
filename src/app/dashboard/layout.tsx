import { Suspense } from 'react'
import { SessionProvider } from './SessionProvider'
import { RoomProvider } from '@/lib/rooms/RoomContext'
import type { ReactNode } from 'react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {/*
        Suspense is required here because RoomProvider uses useSearchParams()
        which opts the subtree into dynamic rendering.
      */}
      <Suspense>
        <RoomProvider>{children}</RoomProvider>
      </Suspense>
    </SessionProvider>
  )
}
