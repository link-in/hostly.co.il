'use client'

import React, { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'

export interface NumberStepperProps {
  id?: string
  name?: string
  label?: string
  sublabel?: string
  icon?: React.ReactNode
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  disabled?: boolean
  className?: string
  testId?: string
}

export function NumberStepper({
  id,
  name,
  label,
  sublabel,
  icon,
  value,
  min = 0,
  max = 20,
  step = 1,
  onChange,
  disabled = false,
  className = '',
  testId,
}: NumberStepperProps) {
  const [localVal, setLocalVal] = useState<string>(String(value))
  const [isFocused, setIsFocused] = useState<boolean>(false)

  // Keep local string in sync when external value changes and not actively typing
  useEffect(() => {
    if (!isFocused) {
      setLocalVal(String(value))
    }
  }, [value, isFocused])

  const handleDecrement = () => {
    if (disabled || value <= min) return
    const next = Math.max(min, value - step)
    setLocalVal(String(next))
    onChange(next)
  }

  const handleIncrement = () => {
    if (disabled || value >= max) return
    const next = Math.min(max, value + step)
    setLocalVal(String(next))
    onChange(next)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setLocalVal(raw)

    if (raw === '') {
      return
    }

    const parsed = parseInt(raw, 10)
    if (!Number.isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed)
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
    const parsed = parseInt(localVal, 10)
    if (Number.isNaN(parsed) || parsed < min) {
      setLocalVal(String(min))
      onChange(min)
    } else if (parsed > max) {
      setLocalVal(String(max))
      onChange(max)
    } else {
      setLocalVal(String(parsed))
      onChange(parsed)
    }
  }

  const isAtMin = value <= min
  const isAtMax = value >= max

  return (
    <div className={`w-100 ${className}`.trim()}>
      {(label || sublabel) && (
        <div className="d-flex justify-content-between align-items-center mb-1.5">
          <label
            htmlFor={id}
            className="form-label mb-0 fw-semibold d-flex align-items-center gap-1.5"
            style={{ color: 'var(--htxt-1)', fontSize: '0.9rem' }}
          >
            {icon && <span style={{ color: 'var(--hb)', display: 'inline-flex' }}>{icon}</span>}
            {label}
          </label>
          {sublabel && (
            <span className="text-muted small" style={{ fontSize: '0.8rem' }}>
              {sublabel}
            </span>
          )}
        </div>
      )}

      <div
        className="d-flex align-items-center rounded-3 position-relative"
        style={{
          border: `1px solid ${isFocused ? 'var(--hb)' : 'var(--hborder)'}`,
          boxShadow: isFocused ? '0 0 0 3px rgba(113, 51, 217, 0.12)' : 'none',
          background: '#fff',
          overflow: 'hidden',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          height: '44px',
        }}
      >
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || isAtMin}
          data-testid={testId ? `${testId}-decrement` : 'stepper-decrement'}
          aria-label={label ? `הפחת ${label}` : 'הפחת ערך'}
          className="btn d-flex align-items-center justify-content-center p-0 flex-shrink-0"
          style={{
            width: '42px',
            height: '100%',
            border: 'none',
            background: 'transparent',
            color: isAtMin ? 'var(--htxt-3)' : 'var(--htxt-1)',
            opacity: isAtMin || disabled ? 0.35 : 1,
            cursor: isAtMin || disabled ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s',
            borderInlineEnd: '1px solid var(--hborder-light)',
          }}
        >
          <Minus size={16} strokeWidth={2.5} />
        </button>

        <input
          id={id}
          name={name}
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          min={min}
          max={max}
          step={step}
          value={localVal}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          disabled={disabled}
          data-testid={testId ? `${testId}-input` : 'stepper-input'}
          className="form-control text-center border-0 shadow-none fw-bold p-0 flex-grow-1"
          style={{
            height: '100%',
            fontSize: '1rem',
            color: 'var(--htxt-1)',
            background: 'transparent',
            MozAppearance: 'textfield',
          }}
        />

        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || isAtMax}
          data-testid={testId ? `${testId}-increment` : 'stepper-increment'}
          aria-label={label ? `הוסף ${label}` : 'הוסף ערך'}
          className="btn d-flex align-items-center justify-content-center p-0 flex-shrink-0"
          style={{
            width: '42px',
            height: '100%',
            border: 'none',
            background: 'transparent',
            color: isAtMax ? 'var(--htxt-3)' : 'var(--htxt-1)',
            opacity: isAtMax || disabled ? 0.35 : 1,
            cursor: isAtMax || disabled ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s',
            borderInlineStart: '1px solid var(--hborder-light)',
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
