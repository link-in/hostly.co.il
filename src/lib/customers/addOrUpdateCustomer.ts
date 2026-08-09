import { createServiceRoleClient } from '@/lib/supabase/server'

export type AddOrUpdateCustomerResult = {
  success: boolean
  customerId?: string
  created?: boolean
  updated?: boolean
  error?: string
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Add or update a customer when a booking is created/updated.
 * Matches by phone, email, or full name (Airbnb guests often have no stable phone).
 */
export async function addOrUpdateCustomer(params: {
  userId: string
  fullName: string
  phone?: string | null
  email?: string | null
  bookingDate: string
  bookingSource?: string | null
  /** When false (bulk sync), do not bump total_bookings on update. Default true. */
  incrementBookings?: boolean
}): Promise<AddOrUpdateCustomerResult> {
  try {
    const {
      userId,
      fullName,
      phone,
      email,
      bookingDate,
      bookingSource,
      incrementBookings = true,
    } = params

    if (!fullName || !userId) {
      return { success: false, error: 'Missing required fields' }
    }

    const supabase = createServiceRoleClient()
    let existingCustomer: Record<string, unknown> | null = null

    if (email || phone) {
      // Prefer separate eq filters — phones often include "+" which breaks .or() strings
      if (phone) {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', userId)
          .eq('phone', phone)
          .maybeSingle()
        if (data) existingCustomer = data
      }
      if (!existingCustomer && email) {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', userId)
          .eq('email', email)
          .maybeSingle()
        if (data) existingCustomer = data
      }
    }

    // Fallback: match by name (covers Airbnb guests without usable contact details)
    if (!existingCustomer) {
      const { data: byName } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userId)
        .ilike('full_name', fullName.trim())
        .maybeSingle()

      if (byName) {
        existingCustomer = byName
      }
    }

    if (existingCustomer) {
      console.log('📝 Updating existing customer:', existingCustomer.id)

      const nextTotal = incrementBookings
        ? Number(existingCustomer.total_bookings || 0) + 1
        : Number(existingCustomer.total_bookings || 1)

      const { data, error } = await supabase
        .from('customers')
        .update({
          full_name: fullName,
          phone: phone || existingCustomer.phone,
          email: email || existingCustomer.email,
          last_booking_date: bookingDate,
          total_bookings: nextTotal,
          booking_source: bookingSource || existingCustomer.booking_source || 'direct',
        })
        .eq('id', existingCustomer.id as string)
        .select()
        .single()

      if (error) {
        console.error('Failed to update customer:', error)
        return { success: false, error: error.message }
      }

      console.log('✅ Customer updated successfully:', data.id)
      return { success: true, customerId: data.id, updated: true, created: false }
    }

    const customerId = `customer_${Date.now()}_${Math.random().toString(36).substring(7)}`
    console.log('➕ Creating new customer:', customerId)

    const { data, error } = await supabase
      .from('customers')
      .insert({
        id: customerId,
        user_id: userId,
        full_name: fullName,
        phone: phone || null,
        email: email || null,
        first_booking_date: bookingDate,
        last_booking_date: bookingDate,
        total_bookings: 1,
        booking_source: bookingSource || 'direct',
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create customer:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Customer created successfully:', data.id)
    return { success: true, customerId: data.id, created: true, updated: false }
  } catch (error) {
    console.error('Error in addOrUpdateCustomer:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** Pure helper — used by audit to decide if a booking guest already exists in CRM. */
export function customerMatchesGuest(
  customer: { fullName: string; phone?: string | null; email?: string | null },
  guest: { fullName: string; phone?: string | null; email?: string | null },
): boolean {
  const guestEmail = guest.email?.trim().toLowerCase()
  const guestPhone = guest.phone?.trim()
  if (guestEmail && customer.email?.trim().toLowerCase() === guestEmail) return true
  if (guestPhone && customer.phone?.trim() === guestPhone) return true
  return normalizeName(customer.fullName) === normalizeName(guest.fullName)
}
