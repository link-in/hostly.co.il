/**
 * Mark / unmark a booking as skipped for the arrival-day WhatsApp.
 * POST → insert skipped_manual row (cron will not send)
 * DELETE → remove skipped_manual row (cron will send again)
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { markBookingSkipped, unmarkBookingSkipped, getArrivalMessageLogEntry } from '@/lib/db/arrivalMessages'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const bookingId = searchParams.get('bookingId')
  if (!bookingId) {
    return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })
  }

  const { status, error } = await getArrivalMessageLogEntry(bookingId)
  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ bookingId, status })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const bookingId = b.bookingId
  if (!bookingId) {
    return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })
  }

  const { error } = await markBookingSkipped(
    session.user.id,
    bookingId as string,
    (b.checkInDate as string | null) ?? null,
    (b.guestName as string | undefined),
  )

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ success: true, bookingId, status: 'skipped_manual' })
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const bookingId = searchParams.get('bookingId')
  if (!bookingId) {
    return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })
  }

  const { error } = await unmarkBookingSkipped(bookingId)
  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ success: true, bookingId, status: null })
}
