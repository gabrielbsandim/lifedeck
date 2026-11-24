'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { StatusPage } from '@/components/status-page'

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  const { messages } = useI18n()
  const t = messages.errorPage

  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
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
  )
}
