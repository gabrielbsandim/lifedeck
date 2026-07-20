export type Feature = 'v2' | 'calendar' | 'whatsapp' | 'billing' | 'proactive'

const FEATURE_ENV: Record<Feature, string> = {
  v2: 'FEATURES_V2',
  calendar: 'FEATURE_CALENDAR',
  whatsapp: 'FEATURE_WHATSAPP',
  billing: 'FEATURE_BILLING',
  // Assistant-initiated messaging (daily brief, nudges, habit check-ins).
  proactive: 'FEATURE_PROACTIVE',
}

function flagEnabled(name: string): boolean {
  return process.env[name]?.trim().toLowerCase() === 'true'
}

export function isFeatureEnabled(feature: Feature): boolean {
  if (!flagEnabled(FEATURE_ENV.v2)) {
    return false
  }
  if (feature === 'v2') {
    return true
  }
  return flagEnabled(FEATURE_ENV[feature])
}
