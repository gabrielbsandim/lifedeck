import type { OAuthProvider } from '@/ports/oauth-provider'

type Dependencies = {
  oauth: OAuthProvider
}

export function makeGetGoogleAuthUrl({ oauth }: Dependencies) {
  return function getGoogleAuthUrl(state: string): string {
    return oauth.getAuthorizationUrl(state)
  }
}
