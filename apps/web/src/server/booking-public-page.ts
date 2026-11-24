import { unstable_cache } from 'next/cache'
import {
  NotFoundError,
  type PublicBookingPageView,
} from '@lifedeck/application'
import { getContainer } from '@/server/container'
import { isFeatureEnabled } from '@/server/api/features'
import { BOOKING_PUBLIC_TAG } from '@/server/api/booking-route'

async function load(slug: string): Promise<PublicBookingPageView | null> {
  try {
    return await getContainer().booking.getPublicPage(slug)
  } catch (error) {
    if (error instanceof NotFoundError) {
      return null
    }
    throw error
  }
}

// Crawlers and link previews hit this, so a miss (null) is cached too and an
// unknown slug does not wake the database on every visit.
const cachedLoad = unstable_cache(load, ['booking-public-page'], {
  tags: [BOOKING_PUBLIC_TAG],
  revalidate: 300,
})

export async function loadPublicBookingPage(
  slug: string,
): Promise<PublicBookingPageView | null> {
  if (!isFeatureEnabled('booking')) {
    return null
  }
  return cachedLoad(slug.toLowerCase())
}
