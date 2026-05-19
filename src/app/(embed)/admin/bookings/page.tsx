import type { Metadata } from 'next'
import BookingsAdmin from './BookingsAdmin'

export const metadata: Metadata = { title: 'Bookings — Hostly Admin' }

interface Props {
  searchParams: Promise<{ wpUrl?: string; apiKey?: string }>
}

export default async function BookingsPage({ searchParams }: Props) {
  const { wpUrl = '', apiKey = '' } = await searchParams
  return <BookingsAdmin wpUrl={wpUrl} apiKey={apiKey} />
}
