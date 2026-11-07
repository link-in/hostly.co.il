import { describe, expect, it } from 'vitest'
import { MAX_UPLOAD_BYTES, buildUploadPath, imageUploadRequestSchema } from './imageUpload'

describe('imageUploadRequestSchema', () => {
  it('accepts common image types up to the size limit', () => {
    expect(imageUploadRequestSchema.safeParse({ contentType: 'image/jpeg', size: MAX_UPLOAD_BYTES }).success).toBe(true)
  })

  it('rejects other types, empty files and oversized files', () => {
    expect(imageUploadRequestSchema.safeParse({ contentType: 'image/svg+xml', size: 10 }).success).toBe(false)
    expect(imageUploadRequestSchema.safeParse({ contentType: 'text/html', size: 10 }).success).toBe(false)
    expect(imageUploadRequestSchema.safeParse({ contentType: 'image/png', size: 0 }).success).toBe(false)
    expect(imageUploadRequestSchema.safeParse({ contentType: 'image/png', size: MAX_UPLOAD_BYTES + 1 }).success).toBe(false)
  })
})

describe('buildUploadPath', () => {
  it("puts files under the user's site-builder folder with an extension from the type", () => {
    expect(buildUploadPath('user_1', 'image/jpeg', 'abc')).toBe('user_1/site-builder/abc.jpg')
    expect(buildUploadPath('user_1', 'image/webp', 'abc')).toBe('user_1/site-builder/abc.webp')
  })
})
