export interface CommissionRate {
  id: string
  platform_name: string
  commission_rate: number
  display_name: string
  is_active: boolean
  updated_at: string
  updated_by?: string
  created_at: string
}

export interface UpdateCommissionRateRequest {
  platform_name: string
  commission_rate: number
  display_name?: string
  is_active?: boolean
}
