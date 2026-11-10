import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { resolvePropertyChannels } from '@/lib/pricing/resolvePropertyChannels'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const roomIdOverride = searchParams.get('roomId')

    const propertyId = session.user.propertyId ?? process.env.BEDS24_PROPERTY_ID
    const roomId = (roomIdOverride ?? session.user.roomId ?? process.env.BEDS24_ROOM_ID)
      ?.split(',')[0].split(':')[0].trim()

    const userTokens = session.user.beds24Token && session.user.beds24RefreshToken
      ? { accessToken: session.user.beds24Token, refreshToken: session.user.beds24RefreshToken }
      : undefined

    const resolved = await resolvePropertyChannels({
      userId: session.user.id,
      propertyId,
      roomId,
      userTokens,
      isDemo: Boolean(session.user.isDemo),
    })

    return NextResponse.json(resolved)
  } catch (error) {
    console.error('❌ Error getting channel URLs:', error)
    return NextResponse.json(
      { error: 'Failed to resolve channel URLs', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { airbnb, booking, direct, roomId: reqRoomId } = body

    const roomId = reqRoomId || session.user.roomId?.split(',')[0].split(':')[0].trim() || 'default'

    const supabase = createServiceRoleClient()

    // Fetch existing onboarding_state
    const { data: userRow } = await supabase
      .from('users')
      .select('onboarding_state')
      .eq('id', session.user.id)
      .maybeSingle()

    const currentState = (userRow?.onboarding_state as Record<string, any>) || {}
    const channelUrls = (currentState.channelUrls as Record<string, any>) || {}

    channelUrls[roomId] = {
      airbnb: (airbnb || '').trim(),
      booking: (booking || '').trim(),
      direct: (direct || '').trim(),
      updatedAt: new Date().toISOString(),
    }

    const nextState = {
      ...currentState,
      channelUrls,
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ onboarding_state: nextState })
      .eq('id', session.user.id)

    if (updateError) {
      console.error('❌ Error updating channel URLs in DB:', updateError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      urls: channelUrls[roomId],
    })
  } catch (error) {
    console.error('❌ Error saving channel URLs:', error)
    return NextResponse.json(
      { error: 'Failed to save channel URLs', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
