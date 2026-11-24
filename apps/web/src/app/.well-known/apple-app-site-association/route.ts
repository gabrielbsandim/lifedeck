import { appleAppSiteAssociation } from '@/lib/app-links'

export const dynamic = 'force-static'

export function GET(): Response {
  return Response.json(appleAppSiteAssociation())
}
