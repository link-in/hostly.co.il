// TypeScript types for the digital check-in system

export interface CheckIn {
  id: string
  booking_id: string
  user_id: string
  token: string
  
  // Booking details
  guest_name: string
  guest_phone: string
  guest_email: string | null
  check_in_date: string
  check_out_date: string
  num_adults: number
  num_children: number
  
  // Information collected during check-in
  id_document_url: string | null
  id_document_type: 'id_card' | 'passport' | 'drivers_license' | null
  id_number: string | null
  date_of_birth: string | null
  address: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  actual_num_guests: number | null
  estimated_arrival_time: string | null
  
  // Digital signature
  signature_data_url: string | null
  signature_timestamp: string | null
  terms_accepted: boolean
  terms_version: string
  ip_address: string | null
  
  // Status
  status: 'pending' | 'completed' | 'expired'
  completed_at: string | null
  
  // Access code
  access_code: string | null
  access_code_sent_at: string | null
  
  // Reminders
  reminder_sent_at: string | null
  
  // Timing
  created_at: string
  updated_at: string
  expires_at: string
}

export interface CheckInSettings {
  auto_send_on_booking: boolean
  send_days_before: number
  send_reminder: boolean
  access_code_format: 'digits' | 'alphanumeric' | 'custom'
  wifi_ssid: string
  wifi_password: string
  property_guide: string
  terms_template: 'default' | 'strict' | 'custom'
  custom_terms?: string
  default_access_code?: string
}

export interface CreateCheckInRequest {
  bookingId: string
  guestName: string
  guestPhone: string
  guestEmail?: string
  checkInDate: string
  checkOutDate: string
  numAdult?: number
  numChild?: number
  userId: string
}

export interface CreateCheckInResponse {
  success: boolean
  checkInId: string
  token: string
  link: string
  error?: string
}

export interface CheckInFormData {
  // Step 2: Personal details
  id_document_type: 'id_card' | 'passport' | 'drivers_license'
  id_number: string
  date_of_birth: string
  address: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  actual_num_guests: number
  estimated_arrival_time?: string
  
  // Step 3: Terms and signature
  terms_accepted: boolean
  signature_data_url: string
}

export interface SubmitCheckInRequest {
  token: string
  formData: CheckInFormData
  ip_address?: string
}

export interface SubmitCheckInResponse {
  success: boolean
  access_code: string
  wifi_ssid: string
  wifi_password: string
  property_guide: string
  owner_phone: string
  error?: string
}
