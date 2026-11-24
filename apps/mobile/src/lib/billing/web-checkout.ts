// Store rules decide whether the app may link out to the web checkout at all:
// Apple allows it in Brazil since the 2026 CADE settlement, and Play's rules
// for Brazil still need checking. The build flag stays off until both are
// confirmed, so a store build never shows a purchase link by accident.
const LINK_OUT_REGIONS: Record<string, readonly string[] | 'any'> = {
  web: 'any',
  ios: ['BR'],
  android: ['BR'],
}

export type WebCheckoutContext = {
  os: string
  region: string | null
  enabled: boolean
}

export function webCheckoutAllowed({
  os,
  region,
  enabled,
}: WebCheckoutContext): boolean {
  if (!enabled) {
    return false
  }
  const regions = LINK_OUT_REGIONS[os]
  if (regions === undefined) {
    return false
  }
  if (regions === 'any') {
    return true
  }
  return region !== null && regions.includes(region.toUpperCase())
}
