import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getMessages } from '@taskin/i18n'
import { resolveLocaleFromHeader } from '@/lib/i18n/get-locale'
import { Providers } from '@/app/providers'
import '@/app/globals.css'

export const metadata: Metadata = {
  title: 'TaskIn',
  description: 'Plan your day, share your lists.',
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
