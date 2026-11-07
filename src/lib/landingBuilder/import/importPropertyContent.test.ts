import { describe, expect, it, vi } from 'vitest'
import { DEMO_PROPERTY } from '../demoProperty'
import { buildBeds24Property } from './beds24PropertyFixture'
import { IMPORT_ERROR_MESSAGES, PropertyImportError, toImportErrorMessage } from './errors'
import { importPropertyContent, resolveRoomId, type ImportDeps } from './importPropertyContent'

const IMAGE = { url: 'https://example.supabase.co/storage/v1/object/public/landing-images/a.jpg', alt: 'x' }

function deps(overrides: Partial<ImportDeps> = {}): ImportDeps {
  return {
    fetchProperty: vi.fn(async () => buildBeds24Property()),
    loadImages: vi.fn(async () => [IMAGE]),
    findBeds24Pictures: vi.fn(async () => []),
    ...overrides,
  }
}

const request = { userId: 'user-1', propertyId: '306559', roomField: '638851:נוף הרים,672381:חדר שני' }

describe('resolveRoomId', () => {
  it('honors a requested room that belongs to the user', () => {
    expect(resolveRoomId(request.roomField, '672381')).toBe('672381')
  })

  it('ignores a requested room the user does not own', () => {
    expect(resolveRoomId(request.roomField, '111111')).toBe('638851')
  })

  it('returns null when the user has no rooms', () => {
    expect(resolveRoomId('', '638851')).toBeNull()
  })
})

describe('importPropertyContent', () => {
  it('fetches the session property, loads images and returns validated content', async () => {
    const d = deps()
    const content = await importPropertyContent(request, d)

    expect(d.fetchProperty).toHaveBeenCalledWith('306559')
    expect(d.loadImages).toHaveBeenCalledWith('user-1', 'נוף הרים בדפנה')
    expect(content.propertyId).toBe('306559')
    expect(content.images).toEqual([IMAGE])
  })

  it('fails with no_property when the user has no connected property', async () => {
    const d = deps()
    await expect(importPropertyContent({ ...request, propertyId: '  ' }, d)).rejects.toMatchObject({ code: 'no_property' })
    expect(d.fetchProperty).not.toHaveBeenCalled()
  })

  it('never sends a non-numeric property id to Beds24', async () => {
    const d = deps()
    await expect(importPropertyContent({ ...request, propertyId: 'DEMO_999999' }, d)).rejects.toMatchObject({
      code: 'no_property',
    })
    expect(d.fetchProperty).not.toHaveBeenCalled()
  })

  it('returns the demo property for demo users without calling Beds24 or Supabase', async () => {
    const d = deps()
    const content = await importPropertyContent({ ...request, isDemo: true, propertyId: 'DEMO_999999' }, d)
    expect(content).toEqual(DEMO_PROPERTY)
    expect(d.fetchProperty).not.toHaveBeenCalled()
    expect(d.loadImages).not.toHaveBeenCalled()
    expect(d.findBeds24Pictures).not.toHaveBeenCalled()
  })

  it('fails with not_found when Beds24 does not return the property', async () => {
    const d = deps({ fetchProperty: vi.fn(async () => null) })
    await expect(importPropertyContent(request, d)).rejects.toMatchObject({ code: 'not_found' })
  })

  it('still imports texts when loading images fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const d = deps({ loadImages: vi.fn(async () => Promise.reject(new Error('db down'))) })
    const content = await importPropertyContent(request, d)
    expect(content.images).toEqual([])
    expect(content.name).toBe('נוף הרים בדפנה')
  })

  it('appends Beds24 pictures after landing images, without duplicates', async () => {
    const picture = { url: 'https://media.xmlcal.com/pic/p0030/6559/01.png', alt: 'נוף הרים בדפנה' }
    const d = deps({ findBeds24Pictures: vi.fn(async () => [IMAGE, picture]) })
    const content = await importPropertyContent(request, d)

    expect(d.findBeds24Pictures).toHaveBeenCalledWith('306559', '638851', 'נוף הרים בדפנה')
    expect(content.images).toEqual([IMAGE, picture])
  })

  it('keeps landing images when probing Beds24 pictures fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const d = deps({ findBeds24Pictures: vi.fn(async () => Promise.reject(new Error('offline'))) })
    expect((await importPropertyContent(request, d)).images).toEqual([IMAGE])
  })

  it('rejects images that are not valid URLs', async () => {
    const d = deps({ loadImages: vi.fn(async () => [{ url: 'not a url', alt: '' }]) })
    await expect(importPropertyContent(request, d)).rejects.toMatchObject({ code: 'invalid_content' })
  })
})

describe('toImportErrorMessage', () => {
  it('maps known codes to Hebrew messages and anything else to a generic one', () => {
    expect(toImportErrorMessage(new PropertyImportError('not_found'))).toBe(IMPORT_ERROR_MESSAGES.not_found)
    expect(toImportErrorMessage(new Error('boom'))).toBe(IMPORT_ERROR_MESSAGES.unknown)
  })
})
