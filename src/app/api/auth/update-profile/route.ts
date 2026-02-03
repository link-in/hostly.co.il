import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { getUserByEmail, verifyPassword, hashPassword, updateUser, emailExists } from '@/lib/auth/getUsersDb'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: {
    displayName?: string
    email?: string
    landingPageUrl?: string
    phoneNumber?: string
    currentPassword?: string
    newPassword?: string
    checkInSettings?: {
      wifi_ssid?: string
      wifi_password?: string
      property_guide_url?: string
      terms_text?: string
      liability_waiver_text?: string
      default_access_code?: string
    }
  }

  try {
    payload = await request.json()
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    // Get current user from database
    const currentUser = await getUserByEmail(session.user.email)
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prepare updates object
    const updates: Partial<typeof currentUser> = {}

    // If changing password, verify current password
    if (payload.newPassword) {
      if (!payload.currentPassword) {
        return NextResponse.json({ error: 'יש להזין סיסמה נוכחית' }, { status: 400 })
      }

      const isValid = await verifyPassword(payload.currentPassword, currentUser.passwordHash)
      if (!isValid) {
        return NextResponse.json({ error: 'סיסמה נוכחית שגויה' }, { status: 403 })
      }

      updates.passwordHash = await hashPassword(payload.newPassword)
    }

    // Update editable fields
    if (payload.displayName) {
      updates.displayName = payload.displayName
    }

    if (payload.email) {
      // Check if email is already used by another user
      const emailTaken = await emailExists(payload.email, session.user.id)
      if (emailTaken) {
        return NextResponse.json({ error: 'אימייל כבר בשימוש' }, { status: 400 })
      }
      updates.email = payload.email
    }

    if (payload.landingPageUrl !== undefined) {
      updates.landingPageUrl = payload.landingPageUrl
    }

    if (payload.phoneNumber !== undefined) {
      // Validate phone number format (optional)
      if (payload.phoneNumber && !payload.phoneNumber.match(/^\+?\d{10,15}$/)) {
        return NextResponse.json({ error: 'פורמט מספר טלפון לא תקין. השתמש בפורמט: +972501234567' }, { status: 400 })
      }
      updates.phoneNumber = payload.phoneNumber
    }

    // Update check-in settings if provided
    if (payload.checkInSettings !== undefined) {
      updates.checkInSettings = payload.checkInSettings
    }

    // Update user in database
    const updatedUser = await updateUser(session.user.id, updates)
    
    if (!updatedUser) {
      return NextResponse.json({ error: 'Failed to update user in database' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        propertyId: updatedUser.propertyId,
        roomId: updatedUser.roomId,
        landingPageUrl: updatedUser.landingPageUrl,
        phoneNumber: updatedUser.phoneNumber,
      },
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'עדכון נכשל', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
