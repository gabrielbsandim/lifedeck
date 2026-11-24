// iOS and Android carry different ids: Apple refused `com.lifedeck.app` as
// taken by another team, Play had it free.
export const IOS_APP_ID = '7NDK3458CP.com.gbs.lifedeck'
export const ANDROID_PACKAGE = 'com.lifedeck.app'

// Only links the app has a screen for; booking and auth stay on the web.
export const APP_LINK_PATHS = ['/share/*'] as const

export function appleAppSiteAssociation() {
  return {
    applinks: {
      details: [
        {
          appIDs: [IOS_APP_ID],
          components: APP_LINK_PATHS.map(path => ({ '/': path })),
        },
      ],
    },
  }
}

// The Play App Signing fingerprint exists only after the first upload, so it
// comes from the environment; without it Android shows the chooser instead.
export function androidAssetLinks(fingerprints: string | undefined) {
  const certs = (fingerprints ?? '')
    .split(',')
    .map(value => value.trim().toUpperCase())
    .filter(Boolean)
  if (certs.length === 0) {
    return []
  }
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: ANDROID_PACKAGE,
        sha256_cert_fingerprints: certs,
      },
    },
  ]
}
