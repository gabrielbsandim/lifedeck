import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError } from '@/server/api/respond'
import { isFeatureEnabled } from '@/server/api/features'

export async function POST(request: Request) {
  try {
    if (!isFeatureEnabled('calendar')) {
      return new NextResponse(null, { status: 404 })
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
