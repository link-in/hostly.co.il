/** Beds24 webhook payload types */

export interface Beds24Booking {
  id: number
  propertyId: number
  roomId: number
  status: string
  subStatus: string
  arrival: string
  departure: string
  numAdult: number
  numChild: number
  firstName: string
  lastName: string
  email: string
  phone: string
  mobile: string
  address: string
  city: string
  postcode: string
  country: string
  price: number
  deposit: number
  tax: number
  bookingTime: string
  modifiedTime: string
  apiSource?: string
  [key: string]: unknown
}

export interface Beds24WebhookWrapper {
  timeStamp: string
  booking: Beds24Booking
  infoItems?: unknown[]
  invoiceItems?: unknown[]
  messages?: unknown[]
  retries?: number
}
