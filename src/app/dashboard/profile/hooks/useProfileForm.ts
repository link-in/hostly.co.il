'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  EMPTY_PASSWORD_CHANGE,
  buildSessionPatch,
  buildUpdateProfileRequest,
  hasPasswordInput,
  isProfileDirty,
  profileFormFromUser,
  trimProfileForm,
  validateProfileSubmission,
  type PasswordChange,
  type ProfileFormValues,
} from '@/lib/profile/profileForm'

export type ProfileFieldChange = <K extends keyof ProfileFormValues>(field: K, value: ProfileFormValues[K]) => void
export type PasswordFieldChange = (field: keyof PasswordChange, value: string) => void

async function postProfileUpdate(body: unknown): Promise<void> {
  const response = await fetch('/api/auth/update-profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'עדכון נכשל')
  }
}

/**
 * מצב הטופס של האזור האישי: שדות, שינוי סיסמה, זיהוי "יש שינויים שלא נשמרו" ושמירה.
 * רענון ה-session (למשל חזרה לטאב) לא דורס עריכה שעדיין לא נשמרה.
 */
export function useProfileForm() {
  const { data: session, update } = useSession()
  const sessionForm = useMemo(() => profileFormFromUser(session?.user), [session?.user])
  const sessionFormKey = JSON.stringify(sessionForm)

  const [values, setValues] = useState<ProfileFormValues>(sessionForm)
  const [password, setPassword] = useState<PasswordChange>(EMPTY_PASSWORD_CHANGE)
  const baselineRef = useRef<ProfileFormValues>(sessionForm)
  const [baseline, setBaseline] = useState<ProfileFormValues>(sessionForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const next = JSON.parse(sessionFormKey) as ProfileFormValues
    // חייבים לתפוס את הבסיס הישן לפני שדורסים אותו — ה-updater של setValues רץ מאוחר יותר.
    const previousBaseline = baselineRef.current
    baselineRef.current = next
    setBaseline(next)
    setValues((current) => (isProfileDirty(current, previousBaseline) ? current : next))
  }, [sessionFormKey])

  const setField = useCallback<ProfileFieldChange>((field, value) => {
    setSuccess(null)
    setValues((current) => ({ ...current, [field]: value }))
  }, [])

  const setPasswordField = useCallback<PasswordFieldChange>((field, value) => {
    setSuccess(null)
    setPassword((current) => ({ ...current, [field]: value }))
  }, [])

  const dirty = isProfileDirty(values, baseline) || hasPasswordInput(password)

  const reset = useCallback(() => {
    setValues(baselineRef.current)
    setPassword(EMPTY_PASSWORD_CHANGE)
    setError(null)
    setSuccess(null)
  }, [])

  const save = useCallback(async () => {
    setError(null)
    setSuccess(null)

    const validationError = validateProfileSubmission(values, password)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    try {
      await postProfileUpdate(buildUpdateProfileRequest(values, password))
      await update(buildSessionPatch(values))
      const saved = trimProfileForm(values)
      baselineRef.current = saved
      setBaseline(saved)
      setValues(saved)
      setPassword(EMPTY_PASSWORD_CHANGE)
      setSuccess('הפרטים נשמרו בהצלחה')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'עדכון נכשל')
    } finally {
      setSaving(false)
    }
  }, [values, password, update])

  return { values, password, dirty, saving, error, success, setField, setPasswordField, reset, save }
}
