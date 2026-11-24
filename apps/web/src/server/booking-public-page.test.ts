// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError } from '@lifedeck/application'

const getPublicPage = vi.fn()
const cacheOptions = vi.fn()

vi.mock('@/server/container', () => ({
  getContainer: () => ({ booking: { getPublicPage } }),
}))

vi.mock('next/cache', () => ({
  unstable_cache: (
    fn: (slug: string) => Promise<unknown>,
    keys: string[],
    options: unknown,
  ) => {
    cacheOptions(keys, options)
    return fn
  },
  revalidateTag: vi.fn(),
}))

const { loadPublicBookingPage } = await import('@/server/booking-public-page')

beforeEach(() => {
  vi.stubEnv('FEATURES_V2', 'true')
  vi.stubEnv('FEATURE_BOOKING', 'true')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('loadPublicBookingPage', () => {
  it('caches under the public tag for five minutes', () => {
    expect(cacheOptions).toHaveBeenCalledWith(['booking-public-page'], {
      tags: ['booking-public'],
      revalidate: 300,
    })
  })

  it('loads the page by its lowercased slug', async () => {
    getPublicPage.mockResolvedValue({ slug: 'ana' })
    expect(await loadPublicBookingPage('Ana')).toEqual({ slug: 'ana' })
    expect(getPublicPage).toHaveBeenCalledWith('ana')
  })

  it('turns an unknown page into null and rethrows anything else', async () => {
    getPublicPage.mockRejectedValueOnce(new NotFoundError('page'))
    expect(await loadPublicBookingPage('nobody')).toBeNull()
    getPublicPage.mockRejectedValueOnce(new Error('db down'))
    await expect(loadPublicBookingPage('ana')).rejects.toThrow('db down')
  })

  it('stays dark while the feature is off', async () => {
    vi.stubEnv('FEATURE_BOOKING', 'false')
    expect(await loadPublicBookingPage('ana')).toBeNull()
    expect(getPublicPage).not.toHaveBeenCalled()
  })
})
