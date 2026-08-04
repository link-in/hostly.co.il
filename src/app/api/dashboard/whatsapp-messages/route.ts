import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { listWhatsAppMessagesForUser, type WhatsAppLogStatus } from '@/lib/db/whatsappMessages'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard/whatsapp-messages
 * Lists WhatsApp send attempts for the authenticated host.
 *
 * Query: ?status=sent|failed|skipped|all&type=<message_type>&limit=100&offset=0
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = (searchParams.get('status') || 'all') as WhatsAppLogStatus | 'all'
    const messageType = searchParams.get('type') || 'all'
    const limit = Number(searchParams.get('limit') || '100')
    const offset = Number(searchParams.get('offset') || '0')

    const { rows, total } = await listWhatsAppMessagesForUser({
      userId: session.user.id,
      status,
      messageType,
      limit: Number.isFinite(limit) ? limit : 100,
      offset: Number.isFinite(offset) ? offset : 0,
    })

    return NextResponse.json({ messages: rows, total })
  } catch (error) {
    console.error('❌ Error fetching WhatsApp messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}
