import { androidAssetLinks } from '@/lib/app-links'

export function GET(): Response {
  return Response.json(
    androidAssetLinks(process.env.ANDROID_APP_SIGNING_SHA256),
    { headers: { 'cache-control': 'public, max-age=3600' } },
  )
}
