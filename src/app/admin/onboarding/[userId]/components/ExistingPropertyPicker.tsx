'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import type { OnboardingApi, PropertySummary } from '../onboardingApi'

export interface PickedRoom {
  propertyId: string
  roomId: string
}

interface ExistingPropertyPickerProps {
  api: OnboardingApi
  disabled?: boolean
  onPick: (room: PickedRoom) => void
}

export function ExistingPropertyPicker({ api, disabled, onPick }: ExistingPropertyPickerProps) {
  const [properties, setProperties] = useState<PropertySummary[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadProperties() {
    setLoading(true)
    setError(null)
    try {
      setProperties((await api.listAccountProperties()).properties)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="d-flex flex-column gap-2">
      {properties === null ? (
        <Button type="button" variant="outline" size="sm" className="align-self-start" onClick={loadProperties} disabled={disabled || loading}>
          טען נכסים מחשבון ה-Beds24
        </Button>
      ) : properties.length === 0 ? (
        <div className="alert alert-warning small mb-0">
          לא נמצאו נכסים בחשבון.
          <Button type="button" variant="ghost" size="sm" className="ms-2" onClick={loadProperties}>טען שוב</Button>
        </div>
      ) : (
        properties.flatMap((property) =>
          property.rooms.map((room) => (
            <button
              key={`${property.propertyId}:${room.roomId}`}
              type="button"
              className="text-start rounded-3 p-2"
              style={{ background: 'var(--hsurf)', border: '1px solid var(--hborder)', color: 'var(--htxt-1)' }}
              disabled={disabled}
              onClick={() => onPick({ propertyId: property.propertyId, roomId: room.roomId })}
            >
              <div className="fw-semibold">{property.name}</div>
              <small className="text-muted">{room.name} · נכס {property.propertyId} · חדר {room.roomId}</small>
            </button>
          )),
        )
      )}

      {loading && <div className="text-muted small"><Loader2 size={14} className="spin" /> טוען...</div>}
      {error && <div className="text-danger small">{error}</div>}
    </div>
  )
}
