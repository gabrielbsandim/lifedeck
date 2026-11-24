import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  type PrivacyManifest,
  REQUIRED_API_REASONS,
  privacyManifestGaps,
} from '@/lib/store/privacy-manifest'

const appJson = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'app.json'), 'utf8'),
) as {
  expo: {
    ios: { config?: { usesNonExemptEncryption?: boolean } }
  } & Parameters<typeof privacyManifestGaps>[0]
}

const row = (type: string, tracking = false) => ({
  NSPrivacyCollectedDataType: `NSPrivacyCollectedDataType${type}`,
  NSPrivacyCollectedDataTypeLinked: true,
  NSPrivacyCollectedDataTypeTracking: tracking,
  NSPrivacyCollectedDataTypePurposes: [
    'NSPrivacyCollectedDataTypePurposeAppFunctionality',
  ],
})

const allApis = Object.entries(REQUIRED_API_REASONS).map(
  ([category, reasons]) => ({
    NSPrivacyAccessedAPIType: category,
    NSPrivacyAccessedAPITypeReasons: reasons,
  }),
)

const manifest = (over: Partial<PrivacyManifest> = {}): PrivacyManifest => ({
  NSPrivacyTracking: false,
  NSPrivacyTrackingDomains: [],
  NSPrivacyCollectedDataTypes: [],
  NSPrivacyAccessedAPITypes: allApis,
  ...over,
})

describe('privacyManifestGaps', () => {
  it('finds no gap in the shipped app.json', () => {
    expect(privacyManifestGaps(appJson.expo)).toEqual([])
  })

  it('ships the export compliance answer so uploads skip the prompt', () => {
    expect(appJson.expo.ios.config?.usesNonExemptEncryption).toBe(false)
  })

  it('reports a missing manifest', () => {
    expect(privacyManifestGaps({ ios: {} })).toEqual([
      'ios.privacyManifests is missing',
    ])
  })

  it('reports a permission or plugin whose data is not declared', () => {
    const gaps = privacyManifestGaps({
      ios: {
        infoPlist: { NSCameraUsageDescription: 'x', UIBackgroundModes: [] },
        privacyManifests: manifest(),
      },
      plugins: [['expo-notifications', {}], 'expo-router'],
    })
    expect(gaps).toEqual([
      'NSCameraUsageDescription needs NSPrivacyCollectedDataTypePhotosorVideos in the manifest',
      'expo-notifications needs NSPrivacyCollectedDataTypeDeviceID in the manifest',
    ])
  })

  it('reports tracking and a missing required reason', () => {
    const gaps = privacyManifestGaps({
      ios: {
        privacyManifests: manifest({
          NSPrivacyTracking: true,
          NSPrivacyTrackingDomains: ['ads.example.com'],
          NSPrivacyCollectedDataTypes: [row('EmailAddress', true)],
          NSPrivacyAccessedAPITypes: allApis.slice(1),
        }),
      },
    })
    expect(gaps).toEqual([
      'NSPrivacyTracking must stay false: the app does not track',
      'NSPrivacyTrackingDomains must stay empty',
      'NSPrivacyCollectedDataTypeEmailAddress is marked as tracking',
      'NSPrivacyAccessedAPICategoryUserDefaults needs reason CA92.1',
    ])
  })

  it('accepts a declared permission', () => {
    const gaps = privacyManifestGaps({
      ios: {
        infoPlist: { NSMicrophoneUsageDescription: 'x' },
        privacyManifests: manifest({
          NSPrivacyCollectedDataTypes: [row('AudioData')],
        }),
      },
    })
    expect(gaps).toEqual([])
  })
})
