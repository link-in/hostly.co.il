'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { CheckCircle2, DownloadCloud, FlaskConical } from 'lucide-react'
import { useBuilderDispatch, useBuilderState } from '../../state/BuilderProvider'
import { importPropertyContent } from '../../state/importPropertyContent'
import { BuilderButton } from '../ui/BuilderButton'

function ChannelLogos() {
  return (
    <div className="flex items-center gap-2" aria-label="ערוצים מסונכרנים">
      <span className="rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-bold tracking-wide text-white">Beds24</span>
      <Image src="/airbnb-logo.png" alt="Airbnb" width={22} height={22} className="rounded-md" />
      <Image src="/booking-logo.png" alt="Booking.com" width={22} height={22} className="rounded-md" />
    </div>
  )
}

function ImportSummary() {
  const { draft } = useBuilderState()
  const importedImages = draft.images.filter((image) => image.source === 'import').length

  return (
    <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-emerald-50 px-2.5 py-2 text-sm text-emerald-800">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        יובאו {importedImages} תמונות, {draft.content.amenities.length} מתקנים ותיאור הנכס.
      </span>
    </div>
  )
}

export default function ImportStep() {
  const { draft } = useBuilderState()
  const dispatch = useBuilderDispatch()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const imported = draft.propertyId !== null

  const handleImport = () =>
    startTransition(async () => {
      try {
        const property = await importPropertyContent()
        dispatch({ type: 'property/imported', property })
        setError(null)
      } catch {
        setError('לא הצלחנו לייבא את נתוני הנכס. נסו שוב בעוד רגע.')
      }
    })

  return (
    <div className="rounded-2xl bg-slate-50 p-2.5 ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-2 px-1 pb-2.5 pt-1">
        <span className="text-sm font-medium text-slate-700">נתונים שכבר מסונכרנים ב-Hostly</span>
        <ChannelLogos />
      </div>
      <BuilderButton
        variant="primary"
        fullWidth
        loading={isPending}
        onClick={handleImport}
        icon={<DownloadCloud className="size-4" aria-hidden />}
      >
        {imported ? 'ייבוא מחדש' : 'ייבוא בלחיצה אחת'}
      </BuilderButton>
      {imported && <ImportSummary />}
      {error && (
        <p role="alert" className="mt-2.5 text-sm text-red-600">
          {error}
        </p>
      )}
      <p className="mt-2.5 flex items-center gap-1.5 px-1 text-xs text-amber-700">
        <FlaskConical className="size-3.5 shrink-0" aria-hidden />
        מצב פיתוח: נטענים נתוני דמו עד לחיבור ל-Supabase.
      </p>
    </div>
  )
}
