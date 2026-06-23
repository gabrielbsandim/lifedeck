// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { siteUrl } from '@/lib/site'

describe('siteUrl', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.VERCEL_URL
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.VERCEL_URL
  })

  it('prefers NEXT_PUBLIC_SITE_URL and trims a trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://lifedeck.app/'
    expect(siteUrl()).toBe('https://lifedeck.app')
  })

  it('falls back to the Vercel URL', () => {
    process.env.VERCEL_URL = 'lifedeck.vercel.app'
    expect(siteUrl()).toBe('https://lifedeck.vercel.app')
  })

  it('defaults to localhost in development', () => {
    expect(siteUrl()).toBe('http://localhost:3000')
  })
})
