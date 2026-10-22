'use client'

import { Info } from 'lucide-react'
import SiteAddressField from './publish/SiteAddressField'

export default function PublishStep() {
  return (
    <div className="space-y-4">
      <SiteAddressField />
      <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-2.5 py-2 text-xs leading-5 text-slate-600">
        <Info className="mt-0.5 size-3.5 shrink-0 text-slate-400" aria-hidden />
        הכתובת נשמרת עם הטיוטה ותיתפס בעת הפרסום. דומיין אישי יתאפשר בהמשך כתוספת.
      </p>
    </div>
  )
}
