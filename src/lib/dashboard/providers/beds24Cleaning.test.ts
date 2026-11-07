import { describe, it, expect } from 'vitest'
import { mapBookingToReservation } from './beds24'

describe('mapBookingToReservation cleaning cost extraction', () => {
  it('extracts direct cleaningCost number', () => {
    const res = mapBookingToReservation({
      id: 123,
      firstName: 'ישראל',
      lastName: 'ישראלי',
      price: 1500,
      cleaningCost: 300,
      cleanerName: 'מרים',
    })

    expect(res.cleaningCost).toBe(300)
    expect(res.hasCleaning).toBe(true)
    expect(res.cleanerName).toBe('מרים')
  })

  it('extracts cleaningCost from cleanerCost field', () => {
    const res = mapBookingToReservation({
      id: 124,
      firstName: 'דוד',
      lastName: 'כהן',
      cleanerCost: 250,
    })

    expect(res.cleaningCost).toBe(250)
    expect(res.hasCleaning).toBe(true)
  })

  it('extracts cleaning cost from invoice items with Hebrew or English description', () => {
    const resHebrew = mapBookingToReservation({
      id: 125,
      invoice: [
        { description: 'חדר', amount: 1000 },
        { description: 'ניקיון דירה', amount: 220 },
      ],
    })
    expect(resHebrew.cleaningCost).toBe(220)
    expect(resHebrew.hasCleaning).toBe(true)

    const resEnglish = mapBookingToReservation({
      id: 126,
      invoice: [
        { description: 'Room Stay', amount: 1200 },
        { description: 'Cleaning fee', amount: 280 },
      ],
    })
    expect(resEnglish.cleaningCost).toBe(280)
    expect(resEnglish.hasCleaning).toBe(true)
  })

  it('extracts cleaning cost and cleaner name from notes tag', () => {
    const res = mapBookingToReservation({
      id: 127,
      notes: 'אורח מבקש מיטת תינוק\n[עלות ניקיון: ₪350, מנקה: אולגה]',
    })

    expect(res.cleaningCost).toBe(350)
    expect(res.hasCleaning).toBe(true)
    expect(res.cleanerName).toBe('אולגה')
  })

  it('handles bookings with no cleaning cost', () => {
    const res = mapBookingToReservation({
      id: 128,
      notes: 'אין בקשות מיוחדות',
    })

    expect(res.cleaningCost).toBeUndefined()
    expect(res.hasCleaning).toBeUndefined()
    expect(res.cleanerName).toBeUndefined()
  })

  it('correctly handles Airbnb channel reservations with cleaning cost and cleaner name', () => {
    const res = mapBookingToReservation({
      id: 129,
      firstName: 'John',
      lastName: 'Smith',
      price: 2500,
      referer: 'Airbnb',
      notes: 'Guest requested early check-in\n[עלות ניקיון: ₪300, מנקה: מרים]',
    })

    expect(res.source).toBe('Airbnb')
    expect(res.cleaningCost).toBe(300)
    expect(res.hasCleaning).toBe(true)
    expect(res.cleanerName).toBe('מרים')
  })

  it('correctly handles Booking.com channel reservations with direct cleaning fields', () => {
    const res = mapBookingToReservation({
      id: 130,
      firstName: 'Anna',
      lastName: 'Müller',
      price: 1800,
      channel: 'Booking.com',
      cleaningCost: 220,
      cleanerName: 'יוסי',
    })

    expect(res.source).toBe('Booking.com')
    expect(res.cleaningCost).toBe(220)
    expect(res.hasCleaning).toBe(true)
    expect(res.cleanerName).toBe('יוסי')
  })

  it('respects explicit hasCleaning: false and ignores any stale notes tag', () => {
    const res = mapBookingToReservation({
      id: 131,
      hasCleaning: false,
      notes: 'Old stay notes\n[עלות ניקיון: ₪250, מנקה: מרים]',
    })

    expect(res.hasCleaning).toBe(false)
    expect(res.cleaningCost).toBeUndefined()
    expect(res.cleanerName).toBeUndefined()
  })

  it('respects cleaningCost: 0 and ignores any stale notes tag', () => {
    const res = mapBookingToReservation({
      id: 132,
      cleaningCost: 0,
      notes: 'Old stay notes\n[עלות ניקיון: ₪250, מנקה: מרים]',
    })

    expect(res.cleaningCost).toBeUndefined()
    expect(res.cleanerName).toBeUndefined()
  })
})
