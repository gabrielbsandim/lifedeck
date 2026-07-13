import * as Sentry from '@sentry/nextjs'
import { assertProductionEnv } from '@/server/env'

export async function register() {
  assertProductionEnv()
  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    return
  }
  if (
    process.env.NEXT_RUNTIME === 'nodejs' ||
    process.env.NEXT_RUNTIME === 'edge'
  ) {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      enabled: process.env.NODE_ENV === 'production',
    })
  }
}

export const onRequestError = Sentry.captureRequestError
