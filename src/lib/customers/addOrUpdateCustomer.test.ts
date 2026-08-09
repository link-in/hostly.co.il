import { describe, it, expect } from 'vitest'
import { customerMatchesGuest } from './addOrUpdateCustomer'

describe('customerMatchesGuest', () => {
  it('matches by email', () => {
    expect(
      customerMatchesGuest(
        { fullName: 'A', email: 'a@test.com', phone: null },
        { fullName: 'B', email: 'a@test.com', phone: null },
      ),
    ).toBe(true)
  })

  it('matches by phone', () => {
    expect(
      customerMatchesGuest(
        { fullName: 'A', email: null, phone: '+972501234567' },
        { fullName: 'B', email: null, phone: '+972501234567' },
      ),
    ).toBe(true)
  })

  it('matches by normalized name', () => {
    expect(
      customerMatchesGuest(
        { fullName: 'Inbar  Cohen', email: null, phone: null },
        { fullName: 'inbar cohen', email: null, phone: null },
      ),
    ).toBe(true)
  })

  it('does not match unrelated guests', () => {
    expect(
      customerMatchesGuest(
        { fullName: 'Inbar Cohen', email: null, phone: null },
        { fullName: 'אלירז אלירז', email: null, phone: null },
      ),
    ).toBe(false)
  })
})
