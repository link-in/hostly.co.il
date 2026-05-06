import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { hashPassword } from '@/lib/auth/getUsersDb'
import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/admin/users/[id] - Update user (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check if user is admin
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { id: userId } = await params
    const body = await request.json()
    const { 
      email, 
      password,
      firstName,
      lastName,
      displayName, 
      propertyId, 
      roomId, 
      landingPageUrl,
      phoneNumber,
      role,
    } = body

    // Only email and displayName are required
    if (!email || !displayName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, displayName' },
        { status: 400 }
      )
    }

    // Check if email already exists (for another user)
    const supabase = createServiceRoleClient()
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .ilike('email', email)
      .neq('id', userId)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    // Build update object
    const updates: Record<string, any> = {
      email: email.toLowerCase(),
      first_name: firstName,
      last_name: lastName,
      display_name: displayName,
      property_id: propertyId,
      room_id: roomId,
      landing_page_url: landingPageUrl || null,
      phone_number: phoneNumber || null,
      role: role || 'owner',
    }

    if (password && password.trim() !== '') {
      updates.password_hash = await hashPassword(password)
    }

    // Update user (supabase is already serviceRoleClient)
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update user:', error)
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: data.id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        displayName: data.display_name,
        propertyId: data.property_id,
        roomId: data.room_id,
        landingPageUrl: data.landing_page_url,
        phoneNumber: data.phone_number,
        role: data.role,
        beds24Token: data.beds24_token,
        beds24RefreshToken: data.beds24_refresh_token,
      }
    })
  } catch (error) {
    console.error('Error in PUT /api/admin/users/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/users/[id] - Delete user (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check if user is admin
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { id: userId } = await params

    // Prevent deleting yourself
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Fetch user to get beds24AccountId before deleting
    const { data: userToDelete } = await supabase
      .from('users')
      .select('beds24_account_id')
      .eq('id', userId)
      .maybeSingle()

    // If user has a Beds24 sub-account, disable it (set role to "No Access")
    if (userToDelete?.beds24_account_id) {
      try {
        const BASE_URL = process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'
        await fetchWithTokenRefresh(`${BASE_URL}/accounts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([{
            id: userToDelete.beds24_account_id,
            role: 'No Access',
          }]),
        })
        console.log(`[Beds24] Sub-account ${userToDelete.beds24_account_id} disabled (No Access)`)
      } catch (err) {
        // Non-critical - log but continue with deletion
        console.error('[Beds24] Failed to disable sub-account:', err)
      }
    }

    // Delete user from Hostly
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (error) {
      console.error('Failed to delete user:', error)
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully' 
    })
  } catch (error) {
    console.error('Error in DELETE /api/admin/users/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
