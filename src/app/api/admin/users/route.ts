import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createServerClient } from '@/lib/supabase/server'
import { hashPassword } from '@/lib/auth/getUsersDb'
import type { User } from '@/lib/auth/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/users - Get all users (admin only)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    // Check if user is admin
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch users:', error)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    // Map database columns to User interface (without password_hash)
    const users = data.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      displayName: user.display_name,
      propertyId: user.property_id,
      roomId: user.room_id,
      landingPageUrl: user.landing_page_url,
      phoneNumber: user.phone_number,
      role: user.role,
      beds24Token: user.beds24_token,
      beds24RefreshToken: user.beds24_refresh_token,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/users - Create new user (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check if user is admin
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

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
      role 
    } = body

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !displayName || !propertyId || !roomId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const supabase = createServerClient()
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .ilike('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Generate unique ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Create user
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        property_id: propertyId,
        room_id: roomId,
        landing_page_url: landingPageUrl || null,
        phone_number: phoneNumber || null,
        role: role || 'owner',
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create user:', error)
      return NextResponse.json(
        { error: 'Failed to create user' },
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
      }
    })
  } catch (error) {
    console.error('Error in POST /api/admin/users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
