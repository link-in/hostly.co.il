'use client'

import { useId, useState, type KeyboardEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { addAmenity, removeAmenity } from '@/lib/landingBuilder/amenities'
import { useBuilderDispatch, useBuilderState } from '../../../state/BuilderProvider'

export default function AmenitiesEditor() {
  const { amenities } = useBuilderState().draft.content
  const dispatch = useBuilderDispatch()
  const [pending, setPending] = useState('')
  const inputId = useId()

  const setAmenities = (next: string[]) => dispatch({ type: 'content/edited', patch: { amenities: next } })

  const commit = () => {
    setAmenities(addAmenity(amenities, pending))
    setPending('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    commit()
  }

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
        מתקנים
      </label>
      {amenities.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {amenities.map((amenity) => (
            <li key={amenity} className="flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-1.5 pr-2.5 text-xs text-slate-700">
              {amenity}
              <button
                type="button"
                aria-label={`הסרת ${amenity}`}
                onClick={() => setAmenities(removeAmenity(amenities, amenity))}
                className="grid size-4 cursor-pointer place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id={inputId}
          value={pending}
          onChange={(e) => setPending(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="למשל: ג׳קוזי, Wi-Fi…"
          className="block w-full rounded-xl border-[1px] border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-(--hb) focus:ring-[3px] focus:ring-(--hb)/15"
        />
        <button
          type="button"
          onClick={commit}
          aria-label="הוספת מתקן"
          className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
