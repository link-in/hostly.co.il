'use client'

import { useState, useEffect, useMemo } from 'react'
import { fetchHebrewHolidays, createHolidaysMap } from '@/lib/holidays/hebcal'
import type { Holiday, HolidaysMap } from '@/lib/holidays/types'

type UseHolidaysReturn = {
  holidays: HolidaysMap
  loading: boolean
  error: string | null
}

/**
 * Hook to fetch and manage Hebrew holidays for a given month
 * @param currentMonth - The date representing the current month being displayed
 * @returns Object containing holidays map, loading state, and error
 */
export function useHolidays(currentMonth: Date): UseHolidaysReturn {
  const [allHolidays, setAllHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const year = currentMonth.getFullYear()

  useEffect(() => {
    let isMounted = true

    const loadHolidays = async () => {
      setLoading(true)
      setError(null)

      try {
        const holidays = await fetchHebrewHolidays(year)
        
        if (isMounted) {
          setAllHolidays(holidays)
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load holidays'
          setError(errorMessage)
          console.error('Error loading holidays:', err)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadHolidays()

    return () => {
      isMounted = false
    }
  }, [year])

  // Create a Map for quick lookup by date
  const holidays = useMemo(() => {
    return createHolidaysMap(allHolidays)
  }, [allHolidays])

  return {
    holidays,
    loading,
    error,
  }
}
