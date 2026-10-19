import type { HTMLInputTypeAttribute } from 'react'

interface TextFieldProps {
  id: string
  label: string
  value: string
  onChange?: (value: string) => void
  hint?: string
  type?: HTMLInputTypeAttribute
  placeholder?: string
  /** שדות מספרים/כתובות נכתבים משמאל לימין */
  ltr?: boolean
  readOnly?: boolean
  multiline?: boolean
  rows?: number
  fullWidth?: boolean
  autoComplete?: string
}

export function TextField({
  id,
  label,
  value,
  onChange,
  hint,
  type = 'text',
  placeholder,
  ltr = false,
  readOnly = false,
  multiline = false,
  rows = 4,
  fullWidth = false,
  autoComplete,
}: TextFieldProps) {
  const common = {
    id,
    className: 'form-control',
    value,
    placeholder,
    readOnly,
    dir: ltr ? ('ltr' as const) : undefined,
    'aria-describedby': hint ? `${id}-hint` : undefined,
    autoComplete,
    onChange: (event: { target: { value: string } }) => onChange?.(event.target.value),
  }

  return (
    <div className={`profile-field${fullWidth ? ' profile-field--full' : ''}`}>
      <label htmlFor={id} className="profile-field-label">
        {label}
      </label>
      {multiline ? <textarea {...common} rows={rows} /> : <input {...common} type={type} />}
      {hint ? (
        <span id={`${id}-hint`} className="profile-field-hint">
          {hint}
        </span>
      ) : null}
    </div>
  )
}
