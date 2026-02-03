import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard/check-ins
 * Fetch all check-ins for the authenticated user
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()

    // Fetch check-ins for this user
    const { data: checkIns, error } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching check-ins:', error)
      return NextResponse.json(
        { error: 'Failed to fetch check-ins' },
        { status: 500 }
      )
    }

    console.log(`✅ Fetched ${checkIns?.length || 0} check-ins for user ${session.user.id}`)

    return NextResponse.json(checkIns || [])

  } catch (error) {
    console.error('❌ Unexpected error fetching check-ins:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
