import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Add or update a customer when a booking is created/updated
 * This function checks if the customer exists (by email or phone) and either updates or creates them
 */
export async function addOrUpdateCustomer(params: {
  userId: string
  fullName: string
  phone?: string | null
  email?: string | null
  bookingDate: string
  bookingSource?: string | null
}): Promise<{ success: boolean; customerId?: string; error?: string }> {
  try {
    const { userId, fullName, phone, email, bookingDate, bookingSource } = params

    if (!fullName || !userId) {
      return { success: false, error: 'Missing required fields' }
    }

    const supabase = createServiceRoleClient()

    // Try to find existing customer by email or phone
    let existingCustomer = null

    if (email || phone) {
      const orConditions: string[] = []
      if (email) orConditions.push(`email.eq.${email}`)
      if (phone) orConditions.push(`phone.eq.${phone}`)

      const { data, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userId)
        .or(orConditions.join(','))
        .maybeSingle()

      if (!fetchError && data) {
        existingCustomer = data
      }
    }

    if (existingCustomer) {
      // Update existing customer
      console.log('📝 Updating existing customer:', existingCustomer.id)
      
      const { data, error } = await supabase
        .from('customers')
        .update({
          full_name: fullName,
          phone: phone || existingCustomer.phone,
          email: email || existingCustomer.email,
          last_booking_date: bookingDate,
          total_bookings: existingCustomer.total_bookings + 1,
          booking_source: bookingSource || existingCustomer.booking_source || 'direct',
        })
        .eq('id', existingCustomer.id)
        .select()
        .single()

      if (error) {
        console.error('Failed to update customer:', error)
        return { success: false, error: error.message }
      }

      console.log('✅ Customer updated successfully:', data.id)
      return { success: true, customerId: data.id }
    } else {
      // Create new customer
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
      return { success: true, customerId: data.id }
    }
  } catch (error) {
    console.error('Error in addOrUpdateCustomer:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
