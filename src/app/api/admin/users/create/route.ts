import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createUser } from '@/lib/auth/getUsersDb'

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }
    
    // Parse request body
    const body = await request.json()
    
    // Validate required fields
    const { email, password, displayName, firstName, lastName, propertyId, roomId } = body
    
    if (!email || !password || !displayName || !propertyId || !roomId) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, displayName, propertyId, roomId' },
        { status: 400 }
      )
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }
    
    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }
    
    // Create user
    const newUser = await createUser({
      email,
      password,
      displayName,
      firstName,
      lastName,
      propertyId,
      roomId,
      landingPageUrl: body.landingPageUrl,
      phoneNumber: body.phoneNumber,
      role: body.role || 'owner',
      beds24Token: body.beds24Token,
      beds24RefreshToken: body.beds24RefreshToken,
    })
    
    if (!newUser) {
      return NextResponse.json(
        { error: 'Failed to create user - email may already exist' },
        { status: 400 }
      )
    }
    
    // Return success (without password hash)
    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        propertyId: newUser.propertyId,
        roomId: newUser.roomId,
        landingPageUrl: newUser.landingPageUrl,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
      },
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
