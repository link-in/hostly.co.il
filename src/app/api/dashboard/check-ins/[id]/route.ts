import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard/check-ins/[id]
 * Fetch a specific check-in by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    const supabase = createServerClient()

    // Fetch check-in by ID and verify it belongs to this user
    const { data: checkIn, error } = await supabase
      .from('check_ins')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single()

    if (error || !checkIn) {
      console.error('❌ Check-in not found:', id)
      return NextResponse.json(
        { error: 'Check-in not found' },
        { status: 404 }
      )
    }

    console.log(`✅ Fetched check-in ${id} for user ${session.user.id}`)

    return NextResponse.json(checkIn)

  } catch (error) {
    console.error('❌ Unexpected error fetching check-in:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
