import type { Holiday } from './types'
import holidaysData from './data.json'

/**
 * Get Hebrew holidays from local JSON file (no API calls needed!)
 * Data is pre-loaded for years 2024-2030
 */
export function getHebrewHolidays(year: number): Holiday[] {
  try {
    // Get holidays for the requested year from local data
    const yearKey = year.toString()
    const holidays = (holidaysData as Record<string, Holiday[]>)[yearKey]
    
    if (!holidays) {
      console.warn(`No holiday data available for year ${year}. Data available for 2024-2030.`)
      return []
    }
    
    return holidays
  } catch (error) {
    console.error('Error loading holidays from local data:', error)
    return []
  }
}

/**
 * @deprecated Use getHebrewHolidays instead (now synchronous!)
 */
export async function fetchHebrewHolidays(year: number): Promise<Holiday[]> {
  return getHebrewHolidays(year)
}

/**
 * Get holidays for a specific month from local data
 */
export function getHolidaysForMonth(date: Date): Holiday[] {
  const year = date.getFullYear()
  const allHolidays = getHebrewHolidays(year)
  
  // Filter to specific month
  const month = date.getMonth()
  return allHolidays.filter((holiday) => {
    const holidayDate = new Date(holiday.date)
    return holidayDate.getFullYear() === year && holidayDate.getMonth() === month
  })
}

/**
 * Create a Map of holidays keyed by date string (YYYY-MM-DD)
 */
export function createHolidaysMap(holidays: Holiday[]): Map<string, Holiday> {
  const map = new Map<string, Holiday>()
  
  holidays.forEach((holiday) => {
    map.set(holiday.date, holiday)
  })
  
  return map
}
