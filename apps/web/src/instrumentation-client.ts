import * as Sentry from '@sentry/nextjs'
import { initBotId } from 'botid/client/core'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === 'production',
  })
}

// The public booking form is the one anonymous write; BotID challenges it and
// the route checks the verdict (server/api/booking-guard.ts). Same flag on both
// sides: off Vercel the challenge cannot load and would stall the request.
if (process.env.NEXT_PUBLIC_BOTID_ENABLED === 'true') {
  initBotId({
    protect: [{ path: '/api/v1/public/booking/*/requests', method: 'POST' }],
  })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
