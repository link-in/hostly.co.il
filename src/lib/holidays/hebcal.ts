import type { Holiday, HolidayCache } from './types'

const HEBCAL_API_URL = 'https://www.hebcal.com/hebcal'
const CACHE_KEY_PREFIX = 'hebcal_holidays'
const CACHE_TTL_DAYS = 30

/**
 * Get cache key for a specific year
 */
function getCacheKey(year: number): string {
  return `${CACHE_KEY_PREFIX}_${year}`
}

/**
 * Check if cache is valid
 */
function isCacheValid(cache: HolidayCache | null): boolean {
  if (!cache) return false
  
  const now = Date.now()
  const cacheAge = now - cache.timestamp
  const maxAge = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000
  
  return cacheAge < maxAge
}

/**
 * Get holidays from localStorage cache
 */
function getFromCache(year: number): Holiday[] | null {
  if (typeof window === 'undefined') return null
  
  try {
    const cacheKey = getCacheKey(year)
    const cached = localStorage.getItem(cacheKey)
    
    if (!cached) return null
    
    const cache: HolidayCache = JSON.parse(cached)
    
    if (!isCacheValid(cache)) {
      localStorage.removeItem(cacheKey)
      return null
    }
    
    return cache.holidays
  } catch (error) {
    console.error('Error reading holidays from cache:', error)
    return null
  }
}

/**
 * Save holidays to localStorage cache
 */
function saveToCache(year: number, holidays: Holiday[]): void {
  if (typeof window === 'undefined') return
  
  try {
    const cacheKey = getCacheKey(year)
    const cache: HolidayCache = {
      holidays,
      timestamp: Date.now(),
      year,
    }
    
    localStorage.setItem(cacheKey, JSON.stringify(cache))
  } catch (error) {
    console.error('Error saving holidays to cache:', error)
  }
}

/**
 * Fetch Hebrew holidays from Hebcal API
 */
export async function fetchHebrewHolidays(year: number): Promise<Holiday[]> {
  // Try to get from cache first
  const cached = getFromCache(year)
  if (cached) {
    return cached
  }
  
  try {
    // Build API URL with parameters
    const params = new URLSearchParams({
      v: '1',
      cfg: 'json',
      maj: 'on', // Major holidays
      min: 'on', // Minor holidays
      lg: 'he', // Hebrew language
      year: year.toString(),
    })
    
    const url = `${HEBCAL_API_URL}?${params.toString()}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Hebcal API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.items || !Array.isArray(data.items)) {
      throw new Error('Invalid response format from Hebcal API')
    }
    
    // Transform API response to our Holiday type
    const holidays: Holiday[] = data.items
      .filter((item: any) => item.category === 'holiday')
      .map((item: any) => ({
        date: item.date,
        title: item.title || item.title_orig || '',
        hebrew: item.hebrew || '',
        category: item.category,
        subcat: item.subcat,
      }))
    
    // Save to cache
    saveToCache(year, holidays)
    
    return holidays
  } catch (error) {
    console.error('Error fetching holidays from Hebcal:', error)
    return []
  }
}

/**
 * Get holidays for a specific month (fetches whole year for caching)
 */
export async function getHolidaysForMonth(date: Date): Promise<Holiday[]> {
  const year = date.getFullYear()
  const allHolidays = await fetchHebrewHolidays(year)
  
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
