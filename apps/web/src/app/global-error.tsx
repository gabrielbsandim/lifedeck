'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@lifedeck/ui'
import { detectLocale, getMessages } from '@lifedeck/i18n'
import { StatusPage } from '@/components/status-page'
import '@/app/globals.css'

// Replaces the root layout, so there is no messages provider: the locale comes
// straight from the browser.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  const locale = detectLocale(
    typeof navigator === 'undefined' ? null : navigator.language,
  )
  const messages = getMessages(locale)
  const t = messages.errorPage

  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang={locale}>
      <body className="font-sans antialiased">
        <title>{t.crashTitle}</title>
        <StatusPage
          code={error.digest ? `#${error.digest}` : undefined}
          title={t.crashTitle}
          body={t.crashBody}
          homeLabel={t.backHome}
          action={
            <Button onClick={() => unstable_retry()}>
              {messages.common.retry}
            </Button>
          }
        />
      </body>
    </html>
  )
}
