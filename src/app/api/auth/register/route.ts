import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { hashPassword, getUserByEmailForAuth } from '@/lib/auth/getUsersDb'
import { createTrialSubscription } from '@/lib/auth/subscriptionDb'

export async function POST(request: NextRequest) {
  try {
    const { email, password, displayName, firstName, lastName } = await request.json()

    if (!email?.trim() || !password?.trim() || !displayName?.trim()) {
      return NextResponse.json({ error: 'אימייל, סיסמה ושם תצוגה הם שדות חובה' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'הסיסמה חייבת להכיל לפחות 6 תווים' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Check if email already exists
    const existing = await getUserByEmailForAuth(normalizedEmail)
    if (existing) {
      return NextResponse.json({ error: 'כתובת האימייל הזו כבר רשומה במערכת' }, { status: 409 })
    }

    const supabase = createServiceRoleClient()
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const passwordHash = await hashPassword(password)

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: normalizedEmail,
        password_hash: passwordHash,
        display_name: displayName.trim(),
        first_name: firstName?.trim() || null,
        last_name: lastName?.trim() || null,
        property_id: '',
        room_id: '',
        role: 'owner',
        is_demo: false,
      })
      .select('id, email')
      .single()

    if (error || !data) {
      console.error('[Register] Supabase insert error:', error)
      return NextResponse.json({ error: 'שגיאה ביצירת החשבון, נסה שוב' }, { status: 500 })
    }

    await createTrialSubscription(userId)

    console.log(`[Register] New user created: ${normalizedEmail} (${userId})`)
    return NextResponse.json({ success: true, userId }, { status: 201 })
  } catch (err) {
    console.error('[Register] Unexpected error:', err)
    return NextResponse.json({ error: 'שגיאה פנימית' }, { status: 500 })
  }
}
