'use client'

import type { DraftContent } from '@/lib/landingBuilder/types'
import { useBuilderDispatch, useBuilderState } from '../../../state/BuilderProvider'
import { TextAreaField, TextField } from '../../ui/Fields'

export default function ContentForm() {
  const { content } = useBuilderState().draft
  const dispatch = useBuilderDispatch()
  const edit = (patch: Partial<DraftContent>) => dispatch({ type: 'content/edited', patch })

  return (
    <div className="space-y-3.5">
      <TextField
        label="שם האתר"
        value={content.siteTitle}
        maxLength={80}
        placeholder="נוף הרים בדפנה"
        onValueChange={(siteTitle) => edit({ siteTitle })}
      />
      <TextField
        label="כותרת ראשית"
        hint={`${content.heroTitle.length}/120`}
        value={content.heroTitle}
        maxLength={120}
        placeholder="החופשה המושלמת מתחילה כאן"
        onValueChange={(heroTitle) => edit({ heroTitle })}
      />
      <TextField
        label="תת-כותרת"
        value={content.heroSubtitle}
        maxLength={240}
        placeholder="משפט אחד שמסביר למה כדאי להגיע"
        onValueChange={(heroSubtitle) => edit({ heroSubtitle })}
      />
      <TextAreaField
        label="תיאור הנכס"
        value={content.description}
        maxLength={4000}
        rows={5}
        placeholder="מה מחכה לאורחים, מה יש בסביבה…"
        onValueChange={(description) => edit({ description })}
      />
    </div>
  )
}
