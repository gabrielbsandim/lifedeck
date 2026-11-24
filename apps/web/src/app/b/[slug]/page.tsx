import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { loadPublicBookingPage } from '@/server/booking-public-page'
import { BookingPageView } from '@/components/booking/booking-page-view'
import { bookingMessages } from '@/app/b/booking-messages'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = await loadPublicBookingPage(slug)
  if (!page) {
    return { robots: { index: false } }
  }
  const title = (await bookingMessages()).pageTitle.replace(
    '{name}',
    page.displayName,
  )
  const description = page.headline ?? undefined
  return {
    title,
    description,
    openGraph: { title, description, url: `/b/${page.slug}` },
  }
}

export default async function PublicBookingPage({ params }: Props) {
  const { slug } = await params
  const page = await loadPublicBookingPage(slug)
  if (!page) {
    notFound()
  }
  return <BookingPageView page={page} t={await bookingMessages()} />
}
