import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError } from '@/server/api/respond'
import { isFeatureEnabled } from '@/server/api/features'

export async function POST(request: Request) {
  try {
    if (!isFeatureEnabled('calendar')) {
      return new NextResponse(null, { status: 404 })
    }
    // When a channel token is configured we set it on every watch channel, so
    // a notification missing it did not originate from a channel we created.
    // Fail closed in production: without a configured token, anyone who learns a
    // channel id could trigger sync jobs, so refuse rather than accept blindly.
    // In dev/preview the token stays optional.
    const expectedToken = process.env.GOOGLE_CALENDAR_WEBHOOK_TOKEN?.trim()
    if (!expectedToken) {
      if (process.env.NODE_ENV === 'production') {
        return new NextResponse(null, { status: 401 })
      }
    } else if (request.headers.get('x-goog-channel-token') !== expectedToken) {
      return new NextResponse(null, { status: 401 })
    }
    const channelId = request.headers.get('x-goog-channel-id')
    const resourceState = request.headers.get('x-goog-resource-state')
    // Google sends a one-off `sync` handshake when the channel opens; only
    // act on real change notifications.
    if (channelId && resourceState && resourceState !== 'sync') {
      await getContainer().handleCalendarNotification(channelId)
    }
    return new NextResponse(null, { status: 200 })
  } catch (error) {
    return handleError(error)
  }
}
