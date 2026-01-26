import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * TEMPORARY ENDPOINT - Make a user admin
 * DELETE THIS FILE AFTER USE!
 * 
 * Usage: POST /api/admin/make-admin
 * Body: { "email": "your@email.com", "secret": "your-secret-key" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, secret } = body

    // Security check - use a secret key
    if (secret !== process.env.ADMIN_SETUP_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Update user role to admin
    const { data, error } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .ilike('email', email)
      .select()
      .single()

    if (error) {
      console.error('Failed to update user:', error)
      return NextResponse.json(
        { error: 'Failed to update user', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `User ${email} is now an admin`,
      user: {
        id: data.id,
        email: data.email,
        role: data.role,
      }
    })
  } catch (error) {
    console.error('Error making user admin:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
