'use client'

import { CONTACT_FIELD_ERRORS, CONTACT_MAX_LENGTH, isValidContactValue, type ContactField } from '@/lib/landingBuilder/contact'
import { useBuilderDispatch, useBuilderState } from '../../../state/BuilderProvider'
import { TextField } from '../../ui/Fields'

const FIELDS: ReadonlyArray<{ key: ContactField; label: string; placeholder: string; type: string }> = [
  { key: 'whatsapp', label: 'וואטסאפ', placeholder: '050-1234567', type: 'tel' },
  { key: 'phone', label: 'טלפון', placeholder: '050-1234567', type: 'tel' },
  { key: 'email', label: 'מייל', placeholder: 'name@example.com', type: 'email' },
]

export default function ContactFields() {
  const { draft } = useBuilderState()
  const dispatch = useBuilderDispatch()

  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-sm font-medium text-slate-700">פרטי קשר לבקשות הזמנה</legend>
      <p className="text-xs leading-5 text-slate-500">
        עד לחיבור התשלום, אורחים שולחים בקשה עם התאריכים ואתם מאשרים. מספיק פרט אחד.
      </p>
      {FIELDS.map(({ key, label, placeholder, type }) => (
        <TextField
          key={key}
          label={label}
          error={isValidContactValue(key, draft.contact[key]) ? undefined : CONTACT_FIELD_ERRORS[key]}
          type={type}
          dir="ltr"
          placeholder={placeholder}
          maxLength={CONTACT_MAX_LENGTH[key]}
          value={draft.contact[key]}
          onValueChange={(value) => dispatch({ type: 'contact/edited', patch: { [key]: value } })}
        />
      ))}
    </fieldset>
  )
}
