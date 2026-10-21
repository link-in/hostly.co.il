'use client'

import { PenLine } from 'lucide-react'
import AiGenerateCard from './customize/AiGenerateCard'
import ContentForm from './customize/ContentForm'
import AmenitiesEditor from './customize/AmenitiesEditor'
import ImageManager from './customize/ImageManager'

export default function CustomizeStep() {
  return (
    <div className="space-y-6">
      <AiGenerateCard />
      <section aria-labelledby="manual-edit-title" className="space-y-4">
        <h2 id="manual-edit-title" className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <PenLine className="size-4 text-slate-400" aria-hidden />
          עריכה ידנית
        </h2>
        <ContentForm />
        <AmenitiesEditor />
        <ImageManager />
      </section>
    </div>
  )
}
