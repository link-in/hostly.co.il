'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { FlaskConical } from 'lucide-react'
import { QA_PUSH_TEST_HREF, canRunPushQaTest } from '@/lib/push/qaTest'

/**
 * Admin-only shortcut to the push QA mode. Needed because an installed PWA
 * has no address bar, so `?test_push=1` can't be typed in manually.
 * Renders nothing for non-admin users.
 */
export function AdminPushTestLink() {
  const { data: session } = useSession()
  if (!canRunPushQaTest(session?.user?.role)) return null

  return (
    <div className="profile-row profile-row--accent">
      <div>
        <div className="profile-row-title">בדיקת התראות (אדמין)</div>
        <div className="profile-row-text">
          שולח התראת הזמנה מדומה למכשיר, ואם ההתראות עוד לא אושרו - מציג את בקשת האישור.
        </div>
      </div>
      <Link
        href={QA_PUSH_TEST_HREF}
        className="hostly-btn hostly-btn-on-light hostly-btn-secondary"
      >
        <FlaskConical size={15} />
        הרץ בדיקה
      </Link>
    </div>
  )
}
