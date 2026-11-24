import { describe, expect, it } from 'vitest'
import {
  ANDROID_PACKAGE,
  IOS_APP_ID,
  androidAssetLinks,
  appleAppSiteAssociation,
} from '@/lib/app-links'

describe('appleAppSiteAssociation', () => {
  it('opens shared boards in the iOS app', () => {
    expect(appleAppSiteAssociation()).toEqual({
      applinks: {
        details: [{ appIDs: [IOS_APP_ID], components: [{ '/': '/share/*' }] }],
      },
    })
  })
})

describe('androidAssetLinks', () => {
  it('is empty until a signing fingerprint is configured', () => {
    expect(androidAssetLinks(undefined)).toEqual([])
    expect(androidAssetLinks(' , ')).toEqual([])
  })

  it('lists every configured fingerprint, upper-cased', () => {
    const [statement] = androidAssetLinks('aa:bb, CC:DD')
    expect(statement?.target).toEqual({
      namespace: 'android_app',
      package_name: ANDROID_PACKAGE,
      sha256_cert_fingerprints: ['AA:BB', 'CC:DD'],
    })
  })
})
