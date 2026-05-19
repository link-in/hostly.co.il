/**
 * Live Availability — Direct Beds24 Fetch
 *
 * Fetches per-room availability and pricing directly from the Beds24 API
 * on every request, with no Supabase caching layer.
 *
 * Used by /api/public/calendar when the operator prefers always-fresh data.
 */

import { fetchWithTokenRefresh } from '@/lib/beds24/tokenManager'
import type { AvailabilityRow, CachedAvailability } from './cache'

const BEDS24_BASE_URL = process.env.BEDS24_API_BASE_URL ?? 'https://api.beds24.com/v2'

// ---------------------------------------------------------------------------
// Internal helpers (mirrors of cache.ts utilities)
// ---------------------------------------------------------------------------

function getString( value: unknown, keys: string[] ): string | undefined {
	if ( ! value || typeof value !== 'object' ) return undefined
	for ( const key of keys ) {
		const c = ( value as Record<string, unknown> )[ key ]
		if ( typeof c === 'string' ) return c
		if ( typeof c === 'number' ) return String( c )
	}
	return undefined
}

function getNumber( value: unknown, keys: string[] ): number | undefined {
	if ( ! value || typeof value !== 'object' ) return undefined
	for ( const key of keys ) {
		const c = ( value as Record<string, unknown> )[ key ]
		if ( typeof c === 'number' ) return c
		if ( typeof c === 'string' ) {
			const p = parseFloat( c )
			if ( ! isNaN( p ) ) return p
		}
	}
	return undefined
}

function normalizeDate( d: Date ): Date {
	const n = new Date( d )
	n.setHours( 0, 0, 0, 0 )
	return n
}

function addDays( d: Date, days: number ): Date {
	const n = new Date( d )
	n.setDate( n.getDate() + days )
	return n
}

function fmtDate( d: Date ): string {
	const y = d.getFullYear()
	const m = String( d.getMonth() + 1 ).padStart( 2, '0' )
	const day = String( d.getDate() ).padStart( 2, '0' )
	return `${ y }-${ m }-${ day }`
}

/** Pick the best per-night price for the given guest count from the Beds24 row. */
function resolvePriceForGuests( row: Record<string, unknown>, numGuest: number ): number | undefined {
	// Try price<numGuest>, price<numGuest-1>, ... price1
	for ( let n = Math.min( numGuest, 6 ); n >= 1; n-- ) {
		const v = getNumber( row, [ `price${ n }` ] )
		if ( v !== undefined ) return v
	}
	// Generic fallback keys
	return getNumber( row, [ 'price', 'rate', 'amount', 'basePrice' ] )
}

// ---------------------------------------------------------------------------
// Beds24 calendar parser
// ---------------------------------------------------------------------------

interface DayRow {
	date: string
	price: number
	available: boolean
	minStay: number
}

/**
 * Expand the Beds24 calendar response into a flat array of per-day rows.
 * Beds24 can return either:
 *   - Range style: { from, to, price1, numAvail, ... }
 *   - Row style:   { rows: [ { date, price1, numAvail, ... }, ... ] }
 */
function flattenCalendar( data: unknown, numGuest: number ): DayRow[] {
	const rooms = Array.isArray( ( data as Record<string, unknown> )?.data )
		? ( ( data as Record<string, unknown> ).data as unknown[] )
		: []

	const calendarOnly =
		! rooms.length && ( data as Record<string, unknown> )?.calendar
			? [ { calendar: ( data as Record<string, unknown> ).calendar } ]
			: []

	const sourceRooms = rooms.length ? rooms : calendarOnly

	return sourceRooms.flatMap( ( room: unknown ) => {
		const calendars = Array.isArray( ( room as Record<string, unknown> )?.calendar )
			? ( ( room as Record<string, unknown> ).calendar as unknown[] )
			: []

		return calendars.flatMap( ( calendar: unknown ) => {
			const rows = Array.isArray( ( calendar as Record<string, unknown> )?.rows )
				? ( ( calendar as Record<string, unknown> ).rows as unknown[] )
				: []

			// Row-per-day format
			if ( rows.length ) {
				return rows.flatMap( ( row: unknown ): DayRow[] => {
					const r       = row as Record<string, unknown>
					const date    = getString( row, [ 'date', 'day', 'startDate' ] )
					const price   = resolvePriceForGuests( r, numGuest )
					const avail   = getNumber( row, [ 'numAvail', 'avail', 'available', 'availability', 'units' ] ) ?? 1
					const minStay = getNumber( row, [ 'minStay', 'minimumStay', 'min_stay' ] ) ?? 1
					if ( ! date || price === undefined ) return []
					return [ { date, price, available: avail > 0, minStay } ]
				} )
			}

			// Range format: { from, to, price1, price2, numAvail, minStay }
			const c       = calendar as Record<string, unknown>
			const from    = getString( calendar, [ 'from', 'startDate' ] )
			const to      = getString( calendar, [ 'to', 'endDate' ] )
			const price   = resolvePriceForGuests( c, numGuest )
			const avail   = getNumber( calendar, [ 'numAvail', 'avail', 'available', 'availability', 'units' ] ) ?? 1
			const minStay = getNumber( calendar, [ 'minStay', 'minimumStay', 'min_stay' ] ) ?? 1

			if ( ! from || ! to || price === undefined ) return []

			const start = normalizeDate( new Date( from ) )
			const end   = normalizeDate( new Date( to ) )
			if ( isNaN( start.getTime() ) || isNaN( end.getTime() ) ) return []

			const entries: DayRow[] = []
			let cursor = start
			while ( cursor <= end ) {
				entries.push( { date: fmtDate( cursor ), price, available: avail > 0, minStay } )
				cursor = addDays( cursor, 1 )
			}
			return entries
		} )
	} )
}

// ---------------------------------------------------------------------------
// Blocked-dates helper
// ---------------------------------------------------------------------------

/**
 * Fetches confirmed bookings from Beds24 for the date window and returns
 * a Set of YYYY-MM-DD strings that are occupied.
 */
async function fetchBlockedDates(
	propertyId: string,
	roomId: string,
	startDate: string,
	endDate: string,
	accessToken: string,
	refreshToken: string,
	userId: string,
): Promise<Set<string>> {
	const blocked = new Set<string>()

	try {
		const url = new URL( `${ BEDS24_BASE_URL }/bookings` )
		if ( propertyId ) url.searchParams.set( 'propertyId', propertyId )
		url.searchParams.set( 'roomId', roomId )
		url.searchParams.set( 'arrivalFrom', startDate )
		url.searchParams.set( 'departureFrom', startDate )
		url.searchParams.set( 'arrivalTo', endDate )
		url.searchParams.set( 'departureTo', endDate )

		const response = await fetchWithTokenRefresh(
			url.toString(),
			{ headers: { 'content-type': 'application/json' } },
			{ accessToken, refreshToken },
			userId,
		)

		if ( ! response.ok ) {
			console.warn( `[LiveAvail] /bookings returned ${ response.status } — skipping` )
			return blocked
		}

		const raw = await response.json() as { data?: unknown[] } | unknown[]
		const bookings: unknown[] = Array.isArray( raw )
			? raw
			: Array.isArray( ( raw as { data?: unknown[] } ).data )
				? ( raw as { data: unknown[] } ).data
				: []

		for ( const booking of bookings ) {
			const b         = booking as Record<string, unknown>
			const firstNight = getString( b, [ 'firstNight', 'arrival', 'checkIn', 'startDate' ] )
			const lastNight  = getString( b, [ 'lastNight', 'departure', 'checkOut', 'endDate' ] )

			if ( ! firstNight || ! lastNight ) continue

			const start = normalizeDate( new Date( firstNight ) )
			const end   = normalizeDate( new Date( lastNight ) )

			if ( isNaN( start.getTime() ) || isNaN( end.getTime() ) ) continue

			let cursor = start
			while ( cursor < end ) {
				blocked.add( fmtDate( cursor ) )
				cursor = addDays( cursor, 1 )
			}
		}

		console.log( `[LiveAvail] ${ blocked.size } nights blocked for room ${ roomId }` )
	} catch ( err ) {
		console.warn( '[LiveAvail] fetchBlockedDates error (non-fatal):', err )
	}

	return blocked
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface LiveFetchParams {
	userId: string
	propertyId: string
	roomId: string
	from: string          // YYYY-MM-DD
	to: string            // YYYY-MM-DD
	accessToken: string
	refreshToken: string
	numGuest?: number
}

/**
 * Fetch live availability directly from Beds24, bypassing any cache.
 * Returns the same shape as `getAvailability()` from cache.ts.
 */
export async function fetchLiveAvailability(
	params: LiveFetchParams,
): Promise<CachedAvailability | null> {
	const {
		userId, propertyId, roomId,
		from, to,
		accessToken, refreshToken,
		numGuest = 1,
	} = params

	try {
		// ── Fetch calendar from Beds24 ──────────────────────────────────────
		const calUrl = new URL( `${ BEDS24_BASE_URL }/inventory/rooms/calendar` )
		if ( propertyId ) calUrl.searchParams.set( 'propertyId', propertyId )
		calUrl.searchParams.set( 'roomId', roomId )
		calUrl.searchParams.set( 'startDate', from )
		calUrl.searchParams.set( 'endDate', to )
		calUrl.searchParams.set( 'includePrices', '1' )

		console.log( `[LiveAvail] Fetching calendar: ${ calUrl.toString() }` )

		const calResponse = await fetchWithTokenRefresh(
			calUrl.toString(),
			{ headers: { 'content-type': 'application/json' } },
			{ accessToken, refreshToken },
			userId,
		)

		if ( ! calResponse.ok ) {
			const errBody = await calResponse.text().catch( () => '(unreadable)' )
			console.error(
				`[LiveAvail] /inventory/rooms/calendar returned ${ calResponse.status } — body: ${ errBody }`,
			)
			return null
		}

		const calData: unknown = await calResponse.json()

		// ── Parse calendar ──────────────────────────────────────────────────
		console.log( '[LiveAvail] Raw calendar response:', JSON.stringify( calData ).slice( 0, 500 ) )
		const days = flattenCalendar( calData, numGuest )

		if ( days.length === 0 ) {
			console.warn(
				'[LiveAvail] Calendar has 0 pricing days for room',
				roomId,
				'— no pricing rules configured in Beds24 for this date range.',
			)
			// Return an empty (but valid) availability response rather than null.
			// An empty calendar means no dates are priced/open in Beds24,
			// not that the request itself failed.
			return {
				roomId,
				propertyId,
				cachedAt: new Date().toISOString(),
				availability: [],
			}
		}

		// ── Fetch blocked dates (bookings) ──────────────────────────────────
		const blockedDates = await fetchBlockedDates(
			propertyId, roomId, from, to,
			accessToken, refreshToken, userId,
		)

		// ── Merge: override availability for booked nights ──────────────────
		const availability: AvailabilityRow[] = days.map( ( day ) => ( {
			date: day.date,
			price: day.price,
			available: day.available && ! blockedDates.has( day.date ),
			minStay: day.minStay,
		} ) )

		return {
			roomId,
			propertyId,
			cachedAt: new Date().toISOString(),
			availability,
		}
	} catch ( err ) {
		console.error( '[LiveAvail] Unexpected error:', err instanceof Error ? err.message : err )
		return null
	}
}
