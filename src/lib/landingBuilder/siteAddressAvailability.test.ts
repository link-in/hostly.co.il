import { describe, expect, it, vi } from 'vitest'
import { checkSiteAddress } from './siteAddressAvailability'

describe('checkSiteAddress', () => {
  it('reports invalid addresses without querying', async () => {
    const findOwner = vi.fn()
    expect(await checkSiteAddress('ab', 'user-1', findOwner)).toMatchObject({ status: 'invalid' })
    expect(await checkSiteAddress('admin', 'user-1', findOwner)).toMatchObject({ status: 'invalid' })
    expect(findOwner).not.toHaveBeenCalled()
  })

  it('tells free, own and taken addresses apart', async () => {
    expect(await checkSiteAddress('dafna', 'user-1', async () => null)).toMatchObject({ status: 'available' })
    expect(await checkSiteAddress('dalit', 'user-1', async () => 'user-1')).toMatchObject({ status: 'yours' })
    expect(await checkSiteAddress('dalit', 'user-2', async () => 'user-1')).toMatchObject({ status: 'taken' })
  })
})
