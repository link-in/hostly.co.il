import { describe, expect, it, vi } from 'vitest'

vi.mock('../draftActions', () => ({ saveDraftAction: vi.fn(), signImageUploadAction: vi.fn() }))

import { createInitialDraft } from '@/lib/landingBuilder/draftReducer'
import type { DraftImage, LandingDraft } from '@/lib/landingBuilder/types'
import { persistDraft, type PersistDeps } from './persistDraft'

const hosted: DraftImage = { id: 'a', url: 'https://media.xmlcal.com/pic/p0030/6559/01.png', alt: '', source: 'import' }
const local: DraftImage = { id: 'b', url: 'blob:http://localhost/1', alt: 'x.jpg', source: 'upload' }
const PUBLIC_URL = 'https://x.supabase.co/storage/v1/object/public/landing-images/u/site-builder/b.jpg'

const draft: LandingDraft = { ...createInitialDraft(), images: [hosted, local] }

function deps(overrides: Partial<PersistDeps> = {}): PersistDeps {
  return {
    readFile: vi.fn(async () => new Blob(['x'], { type: 'image/jpeg' })),
    signUpload: vi.fn(async () => ({ ok: true as const, uploadUrl: 'https://signed', publicUrl: PUBLIC_URL })),
    putFile: vi.fn(async () => true),
    save: vi.fn(async () => ({ ok: true as const, savedAt: '2026-10-22T09:00:00.000Z' })),
    ...overrides,
  }
}

describe('persistDraft', () => {
  it('uploads only local images, then saves the draft with hosted URLs', async () => {
    const d = deps()
    const result = await persistDraft(draft, d)

    expect(d.readFile).toHaveBeenCalledTimes(1)
    expect(d.signUpload).toHaveBeenCalledWith({ contentType: 'image/jpeg', size: 1 })
    expect(d.putFile).toHaveBeenCalledWith('https://signed', expect.any(Blob))
    expect(d.save).toHaveBeenCalledWith({ ...draft, images: [hosted, { ...local, url: PUBLIC_URL }] })
    expect(result).toEqual({ urls: { b: PUBLIC_URL }, savedAt: '2026-10-22T09:00:00.000Z' })
  })

  it('does not save when an upload is refused or fails', async () => {
    const refused = deps({ signUpload: vi.fn(async () => ({ ok: false as const, error: 'סוג קובץ לא נתמך' })) })
    await expect(persistDraft(draft, refused)).rejects.toThrow('סוג קובץ לא נתמך')
    expect(refused.save).not.toHaveBeenCalled()

    const failed = deps({ putFile: vi.fn(async () => false) })
    await expect(persistDraft(draft, failed)).rejects.toThrow('העלאת התמונה נכשלה')
    expect(failed.save).not.toHaveBeenCalled()
  })

  it('surfaces the server error message when saving fails', async () => {
    const d = deps({ save: vi.fn(async () => ({ ok: false as const, error: 'שמירה אינה זמינה במשתמש דמו.' })) })
    await expect(persistDraft({ ...draft, images: [hosted] }, d)).rejects.toThrow('שמירה אינה זמינה במשתמש דמו.')
    expect(d.readFile).not.toHaveBeenCalled()
  })
})
