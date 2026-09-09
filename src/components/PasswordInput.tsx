'use client'

import { useId, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onChange'
> & {
  value: string
  onChange: (value: string) => void
}

export default function PasswordInput({
  value,
  onChange,
  disabled,
  style,
  id,
  ...rest
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const generatedId = useId()
  const inputId = id ?? generatedId
  const toggleLabel = visible ? 'הסתר סיסמה' : 'הצג סיסמה'

  return (
    <div style={{ position: 'relative' }}>
      <input
        id={inputId}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          ...style,
          paddingInlineEnd: '44px',
        }}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={toggleLabel}
        aria-pressed={visible}
        aria-controls={inputId}
        title={toggleLabel}
        disabled={disabled}
        style={{
          position: 'absolute',
          insetInlineEnd: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          padding: 0,
          border: 'none',
          background: 'transparent',
          color: '#6b7280',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </button>
    </div>
  )
}
