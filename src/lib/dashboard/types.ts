export type ReservationStatus = 'confirmed' | 'pending' | 'cancelled'

export interface Reservation {
  id: string
  guestName: string
  checkIn: string
  checkOut: string
  nights: number
  total: number
  status: ReservationStatus
  source?: string
  unitName?: string
  createdAt?: string
  phone?: string
  email?: string
  guests?: number
  adults?: number
  children?: number
  notes?: string
  isNew?: boolean // Flag for new demo reservations
}

export interface PriceRule {
  id: string
  title: string
  startDate: string
  endDate: string
  minNights: number
  maxNights?: number
  pricePerNight: number
  isActive: boolean
  notes?: string
}

export interface RoomPrice {
  date: string
  price: number
  roomId?: string | null
}

export interface DashboardProvider {
  getReservations: () => Promise<Reservation[]>
  getPricingRules: () => Promise<PriceRule[]>
  getRoomPrices: () => Promise<RoomPrice[]>
}
