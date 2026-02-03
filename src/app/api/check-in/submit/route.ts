import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { generateAccessCode } from '@/lib/check-in/generateAccessCode'
import { getUserByEmail } from '@/lib/auth/getUsersDb'
import type { SubmitCheckInRequest, SubmitCheckInResponse } from '@/lib/check-in/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/check-in/submit
 * Complete the check-in process
 * Validates all data, generates access code, sends WhatsApp messages
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as SubmitCheckInRequest
    const { token, formData, ip_address } = body

    if (!token || !formData) {
      return NextResponse.json(
        { error: 'Token and form data are required' } as SubmitCheckInResponse,
        { status: 400 }
      )
    }

    // Validate required form fields
    if (!formData.id_document_type || !formData.id_number || !formData.date_of_birth ||
        !formData.address || !formData.terms_accepted || !formData.signature_data_url ||
        !formData.actual_num_guests) {
      return NextResponse.json(
        { error: 'Missing required fields' } as SubmitCheckInResponse,
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Fetch check-in record
    const { data: checkIn, error: fetchError } = await supabase
      .from('check_ins')
      .select('*')
      .eq('token', token)
      .single()

    if (fetchError || !checkIn) {
      return NextResponse.json(
        { error: 'Invalid token' } as SubmitCheckInResponse,
        { status: 404 }
      )
    }

    // Verify not already completed
    if (checkIn.status === 'completed') {
      return NextResponse.json(
        { error: 'Check-in already completed' } as SubmitCheckInResponse,
        { status: 400 }
      )
    }

    // Verify not expired
    const now = new Date()
    const expiresAt = new Date(checkIn.expires_at)
    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Check-in link has expired' } as SubmitCheckInResponse,
        { status: 410 }
      )
    }

    // Fetch user settings
    const { data: user } = await supabase
      .from('users')
      .select('check_in_settings, display_name, phone_number, email')
      .eq('id', checkIn.user_id)
      .single()

    const settings = user?.check_in_settings || {}

    // Generate access code
    const accessCode = settings.default_access_code || 
                      generateAccessCode(settings.access_code_format || 'digits')

    // Update check-in record with completion data
    const { error: updateError } = await supabase
      .from('check_ins')
      .update({
        id_document_type: formData.id_document_type,
        id_number: formData.id_number,
        date_of_birth: formData.date_of_birth,
        address: formData.address,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_phone: formData.emergency_contact_phone || null,
        actual_num_guests: formData.actual_num_guests,
        estimated_arrival_time: formData.estimated_arrival_time || null,
        signature_data_url: formData.signature_data_url,
        signature_timestamp: new Date().toISOString(),
        terms_accepted: true,
        ip_address: ip_address || null,
        status: 'completed',
        completed_at: new Date().toISOString(),
        access_code: accessCode,
        access_code_sent_at: new Date().toISOString(),
      })
      .eq('id', checkIn.id)

    if (updateError) {
      console.error('❌ Error updating check-in:', updateError)
      return NextResponse.json(
        { error: 'Failed to complete check-in' } as SubmitCheckInResponse,
        { status: 500 }
      )
    }

    console.log('✅ Check-in completed:', {
      id: checkIn.id,
      guest: checkIn.guest_name,
      accessCode
    })

    // Send WhatsApp to guest with access code and property guide
    const wifiSSID = settings.wifi_ssid || ''
    const wifiPassword = settings.wifi_password || ''
    const propertyGuide = settings.property_guide || ''
    const propertyName = user?.display_name || 'הנכס'
    const ownerPhone = user?.phone_number || ''

    // Build guest message
    let guestMessage = `מעולה ${checkIn.guest_name}! ✅\n\n`
    guestMessage += `הצ'ק-אין הושלם בהצלחה.\n\n`
    guestMessage += `🔑 קוד כניסה לנכס: ${accessCode}\n\n`
    
    if (wifiSSID) {
      guestMessage += `📶 WiFi:\n`
      guestMessage += `שם רשת: ${wifiSSID}\n`
      if (wifiPassword) {
        guestMessage += `סיסמה: ${wifiPassword}\n`
      }
      guestMessage += `\n`
    }

    if (ownerPhone) {
      guestMessage += `📞 יצירת קשר: ${ownerPhone}\n\n`
    }

    if (propertyGuide) {
      guestMessage += `📖 מדריך לנכס:\n${propertyGuide}\n\n`
    }

    guestMessage += `מחכים לך! 🏡`

    // Send to guest
    let guestWhatsAppResult = { success: false, provider: 'none', error: 'No phone' }
    if (checkIn.guest_phone) {
      guestWhatsAppResult = await sendWhatsAppMessage({
        to: checkIn.guest_phone,
        message: guestMessage
      })
      console.log('📱 Guest WhatsApp:', guestWhatsAppResult.success ? '✅' : '❌')
    }

    // Send notification to owner
    const ownerMessage = `✅ האורח ${checkIn.guest_name} השלים צ'ק-אין דיגיטלי!\n\n` +
                        `📅 כניסה: ${checkIn.check_in_date}\n` +
                        `${formData.estimated_arrival_time ? `🕐 שעה משוערת: ${formData.estimated_arrival_time}\n` : ''}` +
                        `👥 מספר אורחים: ${formData.actual_num_guests}\n` +
                        `📞 טלפון: ${checkIn.guest_phone}`

    if (ownerPhone) {
      const ownerWhatsAppResult = await sendWhatsAppMessage({
        to: ownerPhone,
        message: ownerMessage
      })
      console.log('📱 Owner WhatsApp:', ownerWhatsAppResult.success ? '✅' : '❌')
    }

    // Update customer record to mark check-in completed
    const { error: customerError } = await supabase
      .from('customers')
      .update({ 
        notes: `צ'ק-אין דיגיטלי הושלם ב-${new Date().toLocaleDateString('he-IL')}`
      })
      .eq('user_id', checkIn.user_id)
      .eq('phone', checkIn.guest_phone)

    if (customerError) {
      console.log('⚠️ Could not update customer record:', customerError.message)
    }

    // Return completion data
    return NextResponse.json({
      success: true,
      access_code: accessCode,
      wifi_ssid: wifiSSID,
      wifi_password: wifiPassword,
      property_guide: propertyGuide,
      owner_phone: ownerPhone,
    } as SubmitCheckInResponse)

  } catch (error) {
    console.error('❌ Unexpected error completing check-in:', error)
    return NextResponse.json(
      { error: 'Internal server error' } as SubmitCheckInResponse,
      { status: 500 }
    )
  }
}
