import type { Beds24Error } from '../beds24/types'
import type { ScopeError } from './propertyScope'

/** Shape every tool returns on failure, so the model can explain or ask a follow-up instead of guessing. */
export interface ToolFailure {
  ok: false
  code: string
  message: string
  options?: ScopeError['options']
}

export function isToolFailure(value: object): value is ToolFailure {
  return 'ok' in value && (value as { ok: unknown }).ok === false
}

export function invalidInput(message: string): ToolFailure {
  return { ok: false, code: 'invalid_input', message }
}

export function scopeFailure(error: ScopeError): ToolFailure {
  return { ok: false, code: error.code, message: error.message, options: error.options }
}

export function beds24Failure(error: Beds24Error): ToolFailure {
  return { ok: false, code: `beds24_${error.kind}`, message: error.message }
}
