import React from 'react'
import { StatCard } from '@/components/ui'
import { formatCurrency } from '@/lib/dashboard/utils'
import type { ReservationStats } from '@/lib/dashboard/reservationsList'

/** שתי שורות כרטיסי סטטיסטיקה בגובה אחיד: נפח הזמנות, והכנסות. */
export default function ReservationsStats({ stats }: { stats: ReservationStats }) {
  return (
    <>
      <div className="row g-2 g-md-3 mb-2 mb-md-3">
        <div className="col-6 col-md-3">
          <StatCard label="סה״כ הזמנות" value={String(stats.totalReservations)} />
        </div>
        <div className="col-6 col-md-3">
          <StatCard label="סה״כ לילות" value={String(stats.totalNights)} />
        </div>
        <div className="col-6 col-md-3">
          <StatCard label="מחיר ממוצע ללילה" value={formatCurrency(stats.avgNightlyRate)} />
        </div>
        <div className="col-6 col-md-3">
          <StatCard label="ממוצע להזמנה" value={formatCurrency(stats.avgBookingValue)} />
        </div>
      </div>

      <div className="row g-2 g-md-3 mb-4">
        <div className="col-6 col-md-3">
          <StatCard label="הכנסות ברוטו" value={formatCurrency(stats.totalRevenue)} />
        </div>
        <div className="col-6 col-md-3">
          <StatCard label="סה״כ עמלות" value={formatCurrency(stats.totalCommission)} />
        </div>
        <div className="col-6 col-md-3">
          <StatCard label="עלויות ניקיון" value={formatCurrency(stats.totalCleaningCost)} />
        </div>
        <div className="col-6 col-md-3">
          <StatCard label="רווח נקי (תשלום צפוי)" value={formatCurrency(stats.netRevenue)} />
        </div>
      </div>
    </>
  )
}
