import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { createUser } from '@/lib/auth/getUsersDb'
import { sendWelcomeEmail } from '@/lib/email/sendEmail'
import { validateOwnerPhone } from '@/lib/auth/ownerPhone'

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
    
    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, displayName' },
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
    
    // טלפון חובה ללקוח (לא אדמין): הוא יעד התראות ה-WhatsApp על הזמנות
    const role = body.role || 'owner'
    let phoneNumber: string | undefined = body.phoneNumber
    if (role !== 'admin') {
      const phone = validateOwnerPhone(body.phoneNumber)
      if (!phone.ok) {
        return NextResponse.json({ error: phone.error }, { status: 400 })
      }
      phoneNumber = phone.phone
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
      phoneNumber,
      role,
      beds24Token: body.beds24Token,
      beds24RefreshToken: body.beds24RefreshToken,
      beds24AccountId: body.beds24AccountId,
    })
    
    if (!newUser) {
      return NextResponse.json(
        { error: 'Failed to create user - email may already exist' },
        { status: 400 }
      )
    }

    // Send welcome email with login credentials (non-blocking)
    sendWelcomeEmail({
      to: newUser.email,
      displayName: newUser.displayName,
      password,
    }).catch((err) => console.error('Welcome email failed (non-critical):', err))
    
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
