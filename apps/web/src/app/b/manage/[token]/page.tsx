import type { Metadata } from 'next'
import { ManagedBookingView } from '@/components/booking/managed-booking-view'
import { bookingMessages } from '@/app/b/booking-messages'

// The link is a bearer credential for one booking: never index it, never leak
// it to another site through the referrer.
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await bookingMessages()).manageTitle,
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  }
}

export default async function ManageBookingPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <ManagedBookingView token={token} />
}
