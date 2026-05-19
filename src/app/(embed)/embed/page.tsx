import type { Metadata } from 'next'
import EmbedCalendarClient from './EmbedCalendarClient'

export const metadata: Metadata = {
  title: 'Hostly Calendar',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<{
    apiKey?: string
    roomId?: string
    wpUrl?: string
    skin?: string
    checkIn?: string
    checkOut?: string
    numAdult?: string
    numChild?: string
  }>
}

export default async function EmbedPage({ searchParams }: PageProps) {
  const { apiKey, roomId, wpUrl, skin, checkIn, checkOut, numAdult, numChild } = await searchParams

  if (!apiKey || !roomId) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#fff8e5', fontFamily: 'sans-serif',
      }}>
        <div style={{ textAlign: 'center', padding: 40, color: '#7a5c00' }}>
          <strong>⚠ Hostly Calendar:</strong> חסרים פרמטרים — יש לספק <code>apiKey</code> ו-<code>roomId</code>.
        </div>
      </div>
    )
  }

  // Always use same-origin (empty string) so the client component fetches
  // from the same server that served this embed page — works in dev and production.
  return (
    <div style={{ padding: '16px' }}>
      <EmbedCalendarClient
        apiKey={apiKey}
        roomId={roomId}
        baseUrl=""
        wpUrl={wpUrl ?? ''}
        skin={(skin === 'noir' || skin === 'slate') ? skin : 'purple'}
        initialCheckIn={checkIn}
        initialCheckOut={checkOut}
        initialNumAdult={numAdult ? parseInt(numAdult, 10) : undefined}
        initialNumChild={numChild ? parseInt(numChild, 10) : undefined}
      />
    </div>
  )
}
