import { describe, expect, it } from 'vitest'
import { activeMobileTab } from '@/lib/navigation/active-tab'

describe('activeMobileTab', () => {
  it.each([
    ['/', 'today'],
    ['/lists', 'lists'],
    ['/lists/abc', 'lists'],
    ['/generate', 'assistant'],
    ['/habits', 'habits'],
    ['/calendar', 'profile'],
    ['/settings/billing', 'profile'],
    ['/analytics', 'profile'],
    ['/recurring', 'profile'],
    ['/developers', 'profile'],
  ] as const)('lights up %s as %s', (pathname, tab) => {
    expect(activeMobileTab(pathname)).toBe(tab)
  })

  it('lights up nothing for a page outside the app shell', () => {
    expect(activeMobileTab('/share/token')).toBeNull()
    expect(activeMobileTab('/listsx')).toBeNull()
  })
})
