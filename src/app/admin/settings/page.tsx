'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import type { CommissionRate } from '@/lib/types/commission'

export default function SettingsPage() {
  const [rates, setRates] = useState<CommissionRate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editedRates, setEditedRates] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchRates()
  }, [])

  const fetchRates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/commission-rates')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch rates')
      }

      setRates(data.rates)
      
      // Initialize edited rates
      const initial: Record<string, number> = {}
      data.rates.forEach((rate: CommissionRate) => {
        initial[rate.platform_name] = rate.commission_rate
      })
      setEditedRates(initial)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rates')
    } finally {
      setLoading(false)
    }
  }

  const handleRateChange = (platformName: string, value: string) => {
    const numValue = parseFloat(value)
    if (!isNaN(numValue)) {
      setEditedRates((prev) => ({
        ...prev,
        [platformName]: numValue / 100, // Convert percentage to decimal
      }))
    }
  }

  const handleSave = async (platformName: string) => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/admin/commission-rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform_name: platformName,
          commission_rate: editedRates[platformName],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update rate')
      }

      setSuccess(`עמלת ${data.rate.display_name} עודכנה בהצלחה`)
      await fetchRates()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rate')
    } finally {
      setSaving(false)
    }
  }

  const formatPercentage = (decimal: number) => {
    return (decimal * 100).toFixed(2)
  }

  return (
    <div className="container-fluid py-4" dir="rtl">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 
            className="display-5 fw-bold mb-2"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            ⚙️ הגדרות מערכת
          </h1>
          <p className="text-muted">ניהול עמלות פלטפורמות הזמנה</p>
        </div>
        <Link href="/admin" className="btn btn-outline-secondary">
          חזרה לאדמין
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {success}
          <button type="button" className="btn-close" onClick={() => setSuccess(null)}></button>
        </div>
      )}

      <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
        <div 
          className="card-header border-0"
          style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(249, 147, 251, 0.1) 100%)',
            borderRadius: '12px 12px 0 0',
          }}
        >
          <h5 className="mb-0 fw-bold" style={{ color: '#667eea' }}>
            📊 עמלות פלטפורמות
          </h5>
        </div>
        <div className="card-body p-4">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">טוען...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>פלטפורמה</th>
                    <th>עמלה נוכחית</th>
                    <th>עמלה חדשה (%)</th>
                    <th>סטטוס</th>
                    <th>עדכון אחרון</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((rate) => (
                    <tr key={rate.id}>
                      <td>
                        <strong>{rate.display_name}</strong>
                        <br />
                        <small className="text-muted">{rate.platform_name}</small>
                      </td>
                      <td>
                        <span 
                          className="badge"
                          style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            fontSize: '1rem',
                            padding: '0.5rem 1rem',
                          }}
                        >
                          {formatPercentage(rate.commission_rate)}%
                        </span>
                      </td>
                      <td>
                        <div className="input-group" style={{ maxWidth: '150px' }}>
                          <input
                            type="number"
                            className="form-control"
                            value={formatPercentage(editedRates[rate.platform_name] || 0)}
                            onChange={(e) => handleRateChange(rate.platform_name, e.target.value)}
                            min="0"
                            max="100"
                            step="0.01"
                            disabled={saving}
                          />
                          <span className="input-group-text">%</span>
                        </div>
                      </td>
                      <td>
                        {rate.is_active ? (
                          <span className="badge bg-success">פעיל</span>
                        ) : (
                          <span className="badge bg-secondary">לא פעיל</span>
                        )}
                      </td>
                      <td>
                        <small className="text-muted">
                          {new Date(rate.updated_at).toLocaleDateString('he-IL')}
                          <br />
                          {rate.updated_by && <span>על ידי: {rate.updated_by}</span>}
                        </small>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm"
                          style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                          }}
                          onClick={() => handleSave(rate.platform_name)}
                          disabled={
                            saving ||
                            editedRates[rate.platform_name] === rate.commission_rate
                          }
                        >
                          {saving ? 'שומר...' : 'שמור'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div 
            className="alert alert-info mt-4"
            style={{
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(249, 147, 251, 0.05) 100%)',
              border: '1px solid rgba(102, 126, 234, 0.2)',
              borderRadius: '8px',
            }}
          >
            <h6 className="alert-heading">
              <strong>💡 הסבר:</strong>
            </h6>
            <ul className="mb-0 pe-3">
              <li>
                <strong>Booking.com:</strong> עמלה סטנדרטית בדרך כלל 15%
              </li>
              <li>
                <strong>Airbnb:</strong> עמלה סטנדרטית בדרך כלל 16%
              </li>
              <li>
                <strong>הזמנה ישירה:</strong> ללא עמלה (0%)
              </li>
              <li className="mt-2">
                העמלות משפיעות על חישוב ההכנסות הנטו בדשבורד
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
