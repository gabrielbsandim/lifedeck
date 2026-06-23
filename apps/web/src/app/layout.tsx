import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { getMessages } from '@taskin/i18n'
import { resolveLocaleFromHeader } from '@/lib/i18n/get-locale'
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from '@/lib/site'
import { Providers } from '@/app/providers'
import '@/app/globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  applicationName: SITE_NAME,
  title: {
    default: `${SITE_NAME} - ${SITE_DESCRIPTION}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'default',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} - ${SITE_DESCRIPTION}`,
    description: SITE_DESCRIPTION,
    url: siteUrl(),
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} - ${SITE_DESCRIPTION}`,
    description: SITE_DESCRIPTION,
  },
}

export const viewport: Viewport = {
  themeColor: '#6d4ae6',
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headerList = await headers()
  const locale = resolveLocaleFromHeader(headerList.get('accept-language'))
  const messages = getMessages(locale)

  return (
    <html lang={locale}>
      <body className="font-sans text-slate-900 antialiased">
        <Providers locale={locale} messages={messages}>
          {children}
        </Providers>
      </body>
    </html>
  )
}
