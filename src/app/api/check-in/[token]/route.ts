import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/check-in/[token]
 * Retrieve check-in details by token
 * Called when guest opens the check-in link
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Fetch check-in by token
    const { data: checkIn, error } = await supabase
      .from('check_ins')
      .select('*')
      .eq('token', token)
      .single()

    if (error || !checkIn) {
      console.error('❌ Check-in not found:', token)
      return NextResponse.json(
        { error: 'Check-in not found or invalid token' },
        { status: 404 }
      )
    }

    // Check if expired
    const now = new Date()
    const expiresAt = new Date(checkIn.expires_at)
    if (now > expiresAt) {
      console.log('⏰ Check-in expired:', token)
      
      // Update status to expired
      await supabase
        .from('check_ins')
        .update({ status: 'expired' })
        .eq('id', checkIn.id)
      
      return NextResponse.json(
        { error: 'Check-in link has expired', expired: true },
        { status: 410 }
      )
    }

    // Check if already completed
    if (checkIn.status === 'completed') {
      console.log('✅ Check-in already completed:', token)
      return NextResponse.json(
        { 
          error: 'Check-in already completed', 
          completed: true,
          completedAt: checkIn.completed_at,
          accessCode: checkIn.access_code
        },
        { status: 200 } // Still return 200 to show completion page
      )
    }

    // Fetch user settings for property guide, wifi, etc.
    const { data: user } = await supabase
      .from('users')
      .select('check_in_settings, display_name, phone_number')
      .eq('id', checkIn.user_id)
      .single()

    const settings = user?.check_in_settings || {}

    console.log('✅ Check-in retrieved:', {
      token,
      guest: checkIn.guest_name,
      status: checkIn.status
    })

    // Return check-in data (without sensitive info like user_id)
    return NextResponse.json({
      id: checkIn.id,
      token: checkIn.token,
      guest_name: checkIn.guest_name,
      guest_phone: checkIn.guest_phone,
      guest_email: checkIn.guest_email,
      check_in_date: checkIn.check_in_date,
      check_out_date: checkIn.check_out_date,
      num_adults: checkIn.num_adults,
      num_children: checkIn.num_children,
      status: checkIn.status,
      
      // Partial data if already filled
      id_document_type: checkIn.id_document_type,
      actual_num_guests: checkIn.actual_num_guests,
      
      // Property info
      property_name: user?.display_name || 'הנכס שלנו',
      owner_phone: user?.phone_number,
      
      // Settings
      terms_template: settings.terms_template || 'default',
      custom_terms: settings.custom_terms,
    })

  } catch (error) {
    console.error('❌ Unexpected error fetching check-in:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
