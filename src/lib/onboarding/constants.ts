export const BEDS24_BASE_URL = process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'

/** Airbnb price markup: covers the 15% host commission plus fees. */
export const AIRBNB_PRICE_MULTIPLIER = 1.21

/** Beds24 grants 100 credits per 5-minute window per account. */
export const MIN_CREDITS_BEFORE_CALL = 10

export const DEFAULT_BASE_PRICE_MONTHS = 12

export const CALENDAR_API_KEY_NAME = 'לוח שנה'
