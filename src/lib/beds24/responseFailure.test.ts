import { describe, it, expect } from 'vitest'
import { describeBeds24Failure, hasBeds24Failure } from './responseFailure'

describe('hasBeds24Failure', () => {
  it('detects success:false on any item of an array body', () => {
    expect(hasBeds24Failure([{ success: true }, { success: false }])).toBe(true)
  })

  it('detects success:false on a single object body', () => {
    expect(hasBeds24Failure({ success: false })).toBe(true)
  })

  it('does not flag successful or unrelated bodies', () => {
    expect(hasBeds24Failure([{ success: true }])).toBe(false)
    expect(hasBeds24Failure({ data: [] })).toBe(false)
    expect(hasBeds24Failure('text')).toBe(false)
    expect(hasBeds24Failure(null)).toBe(false)
  })
})

describe('describeBeds24Failure', () => {
  it('joins the distinct error messages', () => {
    const body = [{ success: false, errors: [{ message: 'invalid roomId' }, { message: 'invalid roomId' }] }]
    expect(describeBeds24Failure(body)).toBe('invalid roomId')
  })

  it('uses the fallback when there is no message', () => {
    expect(describeBeds24Failure([{ success: false }], 'fallback')).toBe('fallback')
  })
})
