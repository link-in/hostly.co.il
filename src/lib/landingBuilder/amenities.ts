export const MAX_AMENITIES = 30

export function addAmenity(amenities: readonly string[], value: string): string[] {
  const amenity = value.trim()
  if (!amenity || amenities.includes(amenity) || amenities.length >= MAX_AMENITIES) return [...amenities]
  return [...amenities, amenity]
}

export function removeAmenity(amenities: readonly string[], value: string): string[] {
  return amenities.filter((amenity) => amenity !== value)
}
