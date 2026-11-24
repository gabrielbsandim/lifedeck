import type { ConfigContext, ExpoConfig } from 'expo/config'

// On EAS the file comes from the GOOGLE_SERVICES_JSON file variable; locally it
// is the untracked copy next to this file.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
})
