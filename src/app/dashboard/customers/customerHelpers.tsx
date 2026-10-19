import React from 'react'
import {
  Map,
  Plane,
  Home,
  Hotel,
  Globe,
  Bird,
} from 'lucide-react'

export type Customer = {
  id: string
  fullName: string
  phone: string | null
  email: string | null
  firstBookingDate: string
  lastBookingDate: string
  totalBookings: number
  bookingSource: string
}

// Helper function to get platform icon/logo based on source
export const getPlatformIcon = (source: string | null | undefined, size: number = 24) => {
  const sourceLower = (source || '').toLowerCase()

  // Container style to ensure consistent sizing
  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${size}px`,
    height: `${size}px`,
    flexShrink: 0,
    color: 'var(--htxt-3)',
  }

  if (sourceLower.includes('airbnb')) {
    return (
      <div style={containerStyle}>
        <img
          src="/airbnb-logo.png"
          alt="Airbnb"
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />
      </div>
    )
  }
  if (sourceLower.includes('booking')) {
    return (
      <div style={containerStyle}>
        <img
          src="/booking-logo.png"
          alt="Booking.com"
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />
      </div>
    )
  }
  if (sourceLower.includes('agoda')) {
    return (
      <div style={containerStyle}>
        <Map size={size * 0.85} strokeWidth={1.75} />
      </div>
    )
  }
  if (sourceLower.includes('expedia')) {
    return (
      <div style={containerStyle}>
        <Plane size={size * 0.85} strokeWidth={1.75} />
      </div>
    )
  }
  if (sourceLower.includes('vrbo') || sourceLower.includes('homeaway')) {
    return (
      <div style={containerStyle}>
        <Home size={size * 0.85} strokeWidth={1.75} />
      </div>
    )
  }
  if (sourceLower.includes('tripadvisor')) {
    return (
      <div style={containerStyle}>
        <Bird size={size * 0.85} strokeWidth={1.75} />
      </div>
    )
  }
  if (sourceLower.includes('hotels.com')) {
    return (
      <div style={containerStyle}>
        <Hotel size={size * 0.85} strokeWidth={1.75} />
      </div>
    )
  }
  // הזמנה ישירה או לא מוכר
  return (
    <div style={containerStyle}>
      <Globe size={size * 0.85} strokeWidth={1.75} />
    </div>
  )
}

// Helper function to get source label text
export const getSourceLabel = (source: string) => {
  const lowerSource = (source || '').toLowerCase()
  if (lowerSource.includes('airbnb')) return 'Airbnb'
  if (lowerSource.includes('booking')) return 'Booking'
  if (lowerSource === 'direct') return 'ישירות'
  if (lowerSource.includes('agoda')) return 'Agoda'
  if (lowerSource.includes('expedia')) return 'Expedia'
  if (lowerSource.includes('vrbo') || lowerSource.includes('homeaway')) return 'VRBO'
  if (lowerSource.includes('tripadvisor')) return 'TripAdvisor'
  if (lowerSource.includes('hotels.com')) return 'Hotels.com'
  return source || 'ישירות'
}
