import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { sendPushNotification } from '@/lib/push/send'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await sendPushNotification(session.user.id, {
      title: 'בדיקת התראות מערכת 🔔',
      body: 'מצוין! ההתראות עובדות בהצלחה במכשיר זה.',
      url: '/dashboard'
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error sending test push:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
