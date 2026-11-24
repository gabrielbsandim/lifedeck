import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/lists/',
        '/recurring',
        '/analytics',
        '/developers',
        '/b/manage/',
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
