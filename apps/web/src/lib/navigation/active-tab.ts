export type MobileTab = 'today' | 'lists' | 'assistant' | 'habits' | 'profile'

// Pages without a tab of their own light up the tab the user reaches them
// from: the tools and Calendar both open from the Profile hub.
const TAB_BY_PREFIX: readonly (readonly [string, MobileTab])[] = [
  ['/lists', 'lists'],
  ['/generate', 'assistant'],
  ['/habits', 'habits'],
  ['/settings', 'profile'],
  ['/calendar', 'profile'],
  ['/booking', 'profile'],
  ['/analytics', 'profile'],
  ['/recurring', 'profile'],
  ['/developers', 'profile'],
]

export function activeMobileTab(pathname: string): MobileTab | null {
  if (pathname === '/') {
    return 'today'
  }
  const match = TAB_BY_PREFIX.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
  return match?.[1] ?? null
}
