'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import type { AirbnbListingSummary, AirbnbUserSummary, OnboardingApi } from '../onboardingApi'

export interface PickedListing {
  airbnbUserId: string
  airbnbListingId: string
  listingName?: string
}

interface AirbnbListingPickerProps {
  api: OnboardingApi
  disabled?: boolean
  onPick: (listing: PickedListing) => void
}

export function AirbnbListingPicker({ api, disabled, onPick }: AirbnbListingPickerProps) {
  const [users, setUsers] = useState<AirbnbUserSummary[] | null>(null)
  const [listings, setListings] = useState<AirbnbListingSummary[] | null>(null)
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load<T>(action: () => Promise<T>): Promise<T | undefined> {
    setLoading(true)
    setError(null)
    try {
      return await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return undefined
    } finally {
      setLoading(false)
    }
  }

  async function loadUsers() {
    const res = await load(() => api.listAirbnbUsers())
    if (res) setUsers(res.users)
  }

  async function selectUser(airbnbUserId: string) {
    setSelectedUser(airbnbUserId)
    setListings(null)
    if (!airbnbUserId) return
    const res = await load(() => api.listAirbnbListings(airbnbUserId))
    if (res) setListings(res.listings)
  }

  return (
    <div className="d-flex flex-column gap-2">
      {users === null ? (
        <Button type="button" variant="outline" size="sm" className="align-self-start" onClick={loadUsers} disabled={disabled || loading}>
          טען חשבונות Airbnb מחוברים
        </Button>
      ) : users.length === 0 ? (
        <div className="alert alert-warning small mb-0">
          לא נמצאו חשבונות Airbnb מחוברים. ודא שהלקוח השלים את ההרשאה, ואז טען שוב.
          <Button type="button" variant="ghost" size="sm" className="ms-2" onClick={loadUsers}>טען שוב</Button>
        </div>
      ) : (
        <select
          className="form-select form-select-sm"
          aria-label="חשבון Airbnb"
          value={selectedUser}
          onChange={(e) => selectUser(e.target.value)}
          disabled={disabled || loading}
        >
          <option value="">בחר חשבון Airbnb</option>
          {users.map((u) => (
            <option key={u.airbnbUserId} value={u.airbnbUserId}>{u.name} ({u.airbnbUserId})</option>
          ))}
        </select>
      )}

      {listings && listings.length === 0 && (
        <div className="alert alert-warning small mb-0">
          לא נמצאו מודעות. ייתכן שיש שגיאות תוכן במודעה שהלקוח צריך לתקן ב-Airbnb.
        </div>
      )}

      {listings && listings.length > 0 && (
        <div className="d-flex flex-column gap-2">
          {listings.map((listing) => (
            <button
              key={listing.airbnbListingId}
              type="button"
              className="text-start rounded-3 p-2"
              style={{ background: 'var(--hsurf)', border: '1px solid var(--hborder)', color: 'var(--htxt-1)' }}
              disabled={disabled}
              onClick={() => onPick({
                airbnbUserId: selectedUser,
                airbnbListingId: listing.airbnbListingId,
                listingName: listing.name,
              })}
            >
              <div className="fw-semibold">{listing.name}</div>
              <small className="text-muted">{listing.address ? `${listing.address} · ` : ''}ID {listing.airbnbListingId}</small>
            </button>
          ))}
        </div>
      )}

      {loading && <div className="text-muted small"><Loader2 size={14} className="spin" /> טוען...</div>}
      {error && <div className="text-danger small">{error}</div>}
    </div>
  )
}
