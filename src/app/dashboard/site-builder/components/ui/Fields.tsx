import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const CONTROL_CLASSES =
  'block w-full rounded-xl border-[1px] border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 ' +
  'outline-none transition placeholder:text-slate-400 focus:border-(--hb) focus:ring-[3px] focus:ring-(--hb)/15'

function FieldLabel({ htmlFor, label, hint }: { htmlFor: string; label: string; hint?: string }) {
  return (
    <span className="mb-1.5 flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </span>
  )
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string
  hint?: string
  value: string
  onValueChange: (value: string) => void
}

export function TextField({ label, hint, value, onValueChange, ...props }: TextFieldProps) {
  const id = useId()
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} hint={hint} />
      <input id={id} value={value} onChange={(e) => onValueChange(e.target.value)} className={CONTROL_CLASSES} {...props} />
    </div>
  )
}

interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label: string
  hint?: string
  value: string
  onValueChange: (value: string) => void
}

export function TextAreaField({ label, hint, value, onValueChange, rows = 4, ...props }: TextAreaFieldProps) {
  const id = useId()
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} hint={hint} />
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={`${CONTROL_CLASSES} resize-y leading-6`}
        {...props}
      />
    </div>
  )
}

export function SoonBadge() {
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">בקרוב</span>
  )
}
