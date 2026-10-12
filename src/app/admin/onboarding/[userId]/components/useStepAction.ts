'use client'

import { useCallback, useState } from 'react'

/** Tracks loading/error state for a single wizard action and refreshes the overview on success. */
export function useStepAction(onSuccess: () => Promise<void> | void) {
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
      setRunning(true)
      setError(null)
      try {
        const result = await action()
        await onSuccess()
        return result
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return undefined
      } finally {
        setRunning(false)
      }
    },
    [onSuccess],
  )

  return { running, error, run }
}
