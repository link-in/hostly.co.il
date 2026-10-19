'use client'

import { useState } from 'react'
import { Copy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui'

interface AirbnbAuthLinkProps {
  authUrl: string
}

export function AirbnbAuthLink({ authUrl }: AirbnbAuthLinkProps) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    await navigator.clipboard.writeText(authUrl)
    setCopied(true)
  }

  return (
    <>
      <p className="text-muted small">
        פתח את הקישור בדפדפן שמחובר לחשבון ה-Beds24 הראשי (חלון גלישה פרטית, כשבעלת המודעה מתחברת ל-Airbnb בעצמה).
        אם תשלח את הקישור ללקוח שאינו מחובר ל-Beds24, האישור לא יופיע ברשימה למטה.
        רק בעל המודעה יכול לאשר, לא מארח משותף.
      </p>
      <div className="d-flex gap-2 mb-4">
        <Button type="button" variant="outline" size="sm" iconStart={<Copy size={14} />} onClick={copyLink}>
          {copied ? 'הועתק' : 'העתק קישור הרשאה'}
        </Button>
        <a className="hostly-btn hostly-btn-sm hostly-btn-on-light hostly-btn-outline" href={authUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={14} /> פתח
        </a>
      </div>
    </>
  )
}
