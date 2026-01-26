import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createServerClient } from '@/lib/supabase/server'
import { hashPassword } from '@/lib/auth/getUsersDb'

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
      password, // Optional - only if changing password
      firstName,
      lastName,
      displayName, 
      propertyId, 
      roomId, 
      landingPageUrl,
      phoneNumber,
      role,
      beds24Token,
      beds24RefreshToken
    } = body

    // Validate required fields
    if (!email || !firstName || !lastName || !displayName || !propertyId || !roomId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if email already exists (for another user)
    const supabase = createServerClient()
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

    // Only update password if provided
    if (password && password.trim() !== '') {
      updates.password_hash = await hashPassword(password)
    }

    // Update Beds24 tokens if provided (optional)
    // Only update if explicitly set (allow clearing by passing empty string)
    if (beds24Token !== undefined) {
      updates.beds24_token = beds24Token || null
    }
    if (beds24RefreshToken !== undefined) {
      updates.beds24_refresh_token = beds24RefreshToken || null
    }

    // Update user
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

    // Delete user
    const supabase = createServerClient()
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
