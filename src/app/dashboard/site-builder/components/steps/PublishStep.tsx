'use client'

import { Info } from 'lucide-react'
import ContactFields from './publish/ContactFields'
import PublishStatus from './publish/PublishStatus'
import SiteAddressField from './publish/SiteAddressField'

export default function PublishStep() {
  return (
    <div className="space-y-5">
      <SiteAddressField />
      <ContactFields />
      <PublishStatus />
      <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-2.5 py-2 text-xs leading-5 text-slate-600">
        <Info className="mt-0.5 size-3.5 shrink-0 text-slate-400" aria-hidden />
        שינויים נכנסים לאתר רק אחרי לחיצה על פרסום. דומיין אישי יתאפשר בהמשך כתוספת.
      </p>
    </div>
  )
}
