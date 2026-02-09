export type Holiday = {
  date: string // Format: YYYY-MM-DD
  title: string // English title
  hebrew: string // Hebrew title
  category: string // holiday category
  subcat?: string // subcategory (major, minor)
}

export type HolidayCache = {
  holidays: Holiday[]
  timestamp: number
  year: number
}

export type HolidaysMap = Map<string, Holiday>
