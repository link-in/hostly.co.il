import React from 'react'
import type { PriceRule } from '@/lib/dashboard/types'
import { formatCurrency, formatDate } from '@/lib/dashboard/utils'

type PricingTableProps = {
  rules: PriceRule[]
}

const PricingTable = ({ rules }: PricingTableProps) => {
  if (!rules.length) {
    return <div className="text-muted">אין חוקים להצגה כרגע.</div>
  }

  return (
    <div className="table-responsive">
      <table className="table align-middle">
        <thead>
          <tr className="text-muted small">
            <th>שם חוק</th>
            <th>טווח תאריכים</th>
            <th>מינ׳ לילות</th>
            <th>מקס׳ לילות</th>
            <th>מחיר ללילה</th>
            <th>סטטוס</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr key={rule.id}>
              <td>
                <div className="fw-semibold">{rule.title}</div>
                <div className="text-muted small">{rule.notes ?? '—'}</div>
              </td>
              <td className="small">
                {formatDate(rule.startDate)} - {formatDate(rule.endDate)}
              </td>
              <td>{rule.minNights}</td>
              <td>{rule.maxNights ?? '—'}</td>
              <td className="fw-semibold">{formatCurrency(rule.pricePerNight)}</td>
              <td>
                <span className={`badge ${rule.isActive ? 'bg-success' : 'bg-light text-dark'}`}>
                  {rule.isActive ? 'פעיל' : 'כבוי'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default PricingTable
