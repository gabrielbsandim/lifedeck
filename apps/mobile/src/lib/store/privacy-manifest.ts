type CollectedDataType = {
  NSPrivacyCollectedDataType: string
  NSPrivacyCollectedDataTypeLinked: boolean
  NSPrivacyCollectedDataTypeTracking: boolean
  NSPrivacyCollectedDataTypePurposes: string[]
}

type AccessedApiType = {
  NSPrivacyAccessedAPIType: string
  NSPrivacyAccessedAPITypeReasons: string[]
}

export type PrivacyManifest = {
  NSPrivacyTracking: boolean
  NSPrivacyTrackingDomains: string[]
  NSPrivacyCollectedDataTypes: CollectedDataType[]
  NSPrivacyAccessedAPITypes: AccessedApiType[]
}

export type IosStoreConfig = {
  infoPlist?: Record<string, unknown>
  privacyManifests?: PrivacyManifest
}

export type StoreConfig = {
  ios?: IosStoreConfig
  plugins?: (string | [string, ...unknown[]])[]
}

const DATA_TYPE = 'NSPrivacyCollectedDataType'
const API_CATEGORY = 'NSPrivacyAccessedAPICategory'

// A usage description means the app reads that data and sends it to the API,
// so the Apple label and the manifest must declare it.
const DATA_BEHIND_PERMISSION: Record<string, string> = {
  NSMicrophoneUsageDescription: `${DATA_TYPE}AudioData`,
  NSPhotoLibraryUsageDescription: `${DATA_TYPE}PhotosorVideos`,
  NSCameraUsageDescription: `${DATA_TYPE}PhotosorVideos`,
  NSContactsUsageDescription: `${DATA_TYPE}Contacts`,
  NSLocationWhenInUseUsageDescription: `${DATA_TYPE}CoarseLocation`,
}

const DATA_BEHIND_PLUGIN: Record<string, string> = {
  'expo-notifications': `${DATA_TYPE}DeviceID`,
}

// What React Native and the Expo modules call, per Expo's privacy manifest
// guide; Apple rejects the upload when one is missing.
export const REQUIRED_API_REASONS: Record<string, string[]> = {
  [`${API_CATEGORY}UserDefaults`]: ['CA92.1'],
  [`${API_CATEGORY}FileTimestamp`]: ['0A2A.1', '3B52.1', 'C617.1'],
  [`${API_CATEGORY}DiskSpace`]: ['E174.1', '85F4.1'],
  [`${API_CATEGORY}SystemBootTime`]: ['35F9.1'],
}

const pluginName = (plugin: string | [string, ...unknown[]]): string =>
  typeof plugin === 'string' ? plugin : plugin[0]

function trackingGaps(manifest: PrivacyManifest): string[] {
  const gaps: string[] = []
  if (manifest.NSPrivacyTracking) {
    gaps.push('NSPrivacyTracking must stay false: the app does not track')
  }
  if (manifest.NSPrivacyTrackingDomains.length > 0) {
    gaps.push('NSPrivacyTrackingDomains must stay empty')
  }
  return gaps
}

function collectedGaps(config: StoreConfig, manifest: PrivacyManifest) {
  const declared = new Map(
    manifest.NSPrivacyCollectedDataTypes.map(row => [
      row.NSPrivacyCollectedDataType,
      row,
    ]),
  )
  const permissions = Object.keys(config.ios?.infoPlist ?? {})
    .filter(key => key in DATA_BEHIND_PERMISSION)
    .map(key => [key, DATA_BEHIND_PERMISSION[key]!] as const)
  const plugins = (config.plugins ?? [])
    .map(pluginName)
    .filter(name => name in DATA_BEHIND_PLUGIN)
    .map(name => [name, DATA_BEHIND_PLUGIN[name]!] as const)
  const missing = [...permissions, ...plugins]
    .filter(([, type]) => !declared.has(type))
    .map(([source, type]) => `${source} needs ${type} in the manifest`)
  const misused = [...declared.values()]
    .filter(row => row.NSPrivacyCollectedDataTypeTracking)
    .map(row => `${row.NSPrivacyCollectedDataType} is marked as tracking`)
  return [...missing, ...misused]
}

function apiGaps(manifest: PrivacyManifest): string[] {
  const declared = new Map(
    manifest.NSPrivacyAccessedAPITypes.map(row => [
      row.NSPrivacyAccessedAPIType,
      row.NSPrivacyAccessedAPITypeReasons,
    ]),
  )
  return Object.entries(REQUIRED_API_REASONS).flatMap(([category, reasons]) =>
    reasons
      .filter(reason => !(declared.get(category) ?? []).includes(reason))
      .map(reason => `${category} needs reason ${reason}`),
  )
}

export function privacyManifestGaps(config: StoreConfig): string[] {
  const manifest = config.ios?.privacyManifests
  if (!manifest) {
    return ['ios.privacyManifests is missing']
  }
  return [
    ...trackingGaps(manifest),
    ...collectedGaps(config, manifest),
    ...apiGaps(manifest),
  ]
}
