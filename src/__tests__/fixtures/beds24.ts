/**
 * Canned Beds24 API v2 response fixtures, based on real shapes captured
 * from the dev server logs while building the date-blocking feature.
 * Reused across unit/integration tests so we never need a live Beds24 call.
 */

export const BEDS24_ROOM_ID = 638851
export const BEDS24_PROPERTY_ID = 306559

/** GET /inventory/rooms/calendar — a small set of price-only calendar rows. */
export function beds24CalendarResponse(
  entries: { from: string; to: string; price1: number }[] = [
    { from: '2026-07-11', to: '2026-07-15', price1: 600 },
    { from: '2026-07-16', to: '2026-07-17', price1: 850 },
  ],
) {
  return {
    success: true,
    type: 'calendar',
    count: 1,
    pages: { nextPageExists: false, nextPageLink: null },
    data: [
      {
        roomId: BEDS24_ROOM_ID,
        propertyId: BEDS24_PROPERTY_ID,
        name: 'נוף הרים בדפנה',
        calendar: entries,
      },
    ],
  }
}

/** GET /inventory/rooms — used as a base-price fallback source. */
export function beds24RoomsInfoResponse(price1 = 600) {
  return {
    success: true,
    data: [
      {
        id: BEDS24_ROOM_ID,
        propertyId: BEDS24_PROPERTY_ID,
        price1,
      },
    ],
  }
}

/** POST /inventory/rooms/calendar — success response with a "modified" echo. */
export function beds24PostSuccessResponse(
  calendar: { from: string; to: string; numAvail?: number }[],
) {
  return [
    {
      success: true,
      modified: {
        roomId: BEDS24_ROOM_ID,
        calendar,
      },
    },
  ]
}

/** GET /inventory/rooms/availability — the ground-truth per-day availability endpoint. */
export function beds24AvailabilityResponse(availability: Record<string, boolean>) {
  return {
    success: true,
    type: 'availability',
    count: 1,
    pages: { nextPageExists: false, nextPageLink: null },
    data: [
      {
        roomId: BEDS24_ROOM_ID,
        propertyId: BEDS24_PROPERTY_ID,
        name: 'נוף הרים בדפנה',
        availability,
      },
    ],
  }
}
