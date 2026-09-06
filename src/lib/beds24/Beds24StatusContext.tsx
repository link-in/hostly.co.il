'use client'

/**
 * Beds24StatusContext
 *
 * Provides `isBeds24Suspended` boolean to any component in the dashboard tree.
 * The value is set by <Beds24SuspendedBanner> via its `onSuspendedChange` prop.
 *
 * Usage:
 *   const { isBeds24Suspended } = useBeds24Status()
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface Beds24StatusContextValue {
  isBeds24Suspended: boolean
  setIsBeds24Suspended: (v: boolean) => void
}

const Beds24StatusContext = createContext<Beds24StatusContextValue>({
  isBeds24Suspended: false,
  setIsBeds24Suspended: () => {},
})

export function Beds24StatusProvider({ children }: { children: ReactNode }) {
  const [isBeds24Suspended, setIsBeds24Suspended] = useState(false)
  const set = useCallback((v: boolean) => setIsBeds24Suspended(v), [])

  return (
    <Beds24StatusContext.Provider value={{ isBeds24Suspended, setIsBeds24Suspended: set }}>
      {children}
    </Beds24StatusContext.Provider>
  )
}

export function useBeds24Status() {
  return useContext(Beds24StatusContext)
}
