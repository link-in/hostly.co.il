'use client'

import { useMemo } from 'react'
import { getHebrewHolidays, createHolidaysMap } from '@/lib/holidays/hebcal'
import type { HolidaysMap } from '@/lib/holidays/types'

type UseHolidaysReturn = {
  holidays: HolidaysMap
  loading: boolean
  error: string | null
}

/**
 * Hook to get Hebrew holidays for a given month from local data
 * No API calls - data is loaded instantly from local JSON!
 * @param currentMonth - The date representing the current month being displayed
 * @returns Object containing holidays map
 */
export function useHolidays(currentMonth: Date): UseHolidaysReturn {
  const year = currentMonth.getFullYear()

  // Load holidays synchronously from local data (no API call!)
  const holidays = useMemo(() => {
    try {
      const holidaysList = getHebrewHolidays(year)
      return createHolidaysMap(holidaysList)
    } catch (err) {
      console.error('Error loading holidays:', err)
      return new Map()
    }
  }, [year])

  return {
    holidays,
    loading: false, // No loading needed - data is local and instant!
    error: null,
  }
}
