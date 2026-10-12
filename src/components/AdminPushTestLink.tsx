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
    <div
      className="d-flex align-items-center justify-content-between gap-3 flex-wrap mb-4 p-3"
      style={{ borderRadius: '12px', background: '#f4f1fb', border: '1px solid #e8e3f5' }}
    >
      <div>
        <div className="fw-bold" style={{ color: '#5b3aa8' }}>בדיקת התראות (אדמין)</div>
        <div className="small text-muted">
          שולח התראת הזמנה מדומה למכשיר, ואם ההתראות עוד לא אושרו - מציג את בקשת האישור.
        </div>
      </div>
      <Link
        href={QA_PUSH_TEST_HREF}
        className="btn btn-sm d-inline-flex align-items-center gap-2"
        style={{ borderRadius: '10px', background: '#7133D9', color: '#fff', fontWeight: 600 }}
      >
        <FlaskConical size={15} />
        הרץ בדיקה
      </Link>
    </div>
  )
}
