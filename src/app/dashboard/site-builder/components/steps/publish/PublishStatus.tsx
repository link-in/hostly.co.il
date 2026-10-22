'use client'

import { AlertCircle, ExternalLink, Globe } from 'lucide-react'
import { PUBLISH_BLOCKER_MESSAGES } from '@/lib/landingBuilder/publishing/publishBlockers'
import { buildSiteHost } from '@/lib/landingBuilder/siteAddress'
import { useSitePublishing } from '../../../state/SitePublishing'

const dateFormatter = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' })

function Checklist() {
  const { blockers } = useSitePublishing()
  if (blockers.length === 0) return null
  return (
    <div className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs leading-5 text-amber-800 ring-1 ring-amber-200/70">
      <p className="font-semibold">לפני הפרסום:</p>
      <ul className="mt-1 space-y-0.5">
        {blockers.map((blocker) => (
          <li key={blocker} className="flex items-start gap-1.5">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {PUBLISH_BLOCKER_MESSAGES[blocker]}
          </li>
        ))}
      </ul>
    </div>
  )
}

function LiveSite() {
  const { published, hasUnpublishedChanges } = useSitePublishing()
  if (!published) return null
  const host = buildSiteHost(published.address)
  return (
    <div className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs leading-5 text-emerald-800 ring-1 ring-emerald-200/70">
      <p className="flex items-center gap-1.5 font-semibold">
        <Globe className="size-3.5" aria-hidden />
        האתר באוויר
      </p>
      <a
        href={`https://${host}`}
        target="_blank"
        rel="noreferrer"
        dir="ltr"
        className="mt-1 flex items-center justify-end gap-1 font-medium text-emerald-900 underline underline-offset-2"
      >
        {host}
        <ExternalLink className="size-3" aria-hidden />
      </a>
      <p className="mt-1 text-emerald-700">פורסם לאחרונה: {dateFormatter.format(new Date(published.publishedAt))}</p>
      {hasUnpublishedChanges && <p className="mt-1 text-amber-700">יש שינויים שעוד לא פורסמו.</p>}
    </div>
  )
}

export default function PublishStatus() {
  return (
    <div className="space-y-2.5">
      <LiveSite />
      <Checklist />
    </div>
  )
}
