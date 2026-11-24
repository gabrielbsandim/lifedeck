import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { loadPublicBookingPage } from '@/server/booking-public-page'
import { BookingFlow } from '@/components/booking/booking-flow'
import { bookingMessages } from '@/app/b/booking-messages'

type Props = { params: Promise<{ slug: string; serviceId: string }> }

async function load(params: Props['params']) {
  const { slug, serviceId } = await params
  const page = await loadPublicBookingPage(slug)
  const service = page?.services.find(entry => entry.id === serviceId)
  return page && service ? { page, service } : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await load(params)
  if (!found) {
    return { robots: { index: false } }
  }
  const host = (await bookingMessages()).pageTitle.replace(
    '{name}',
    found.page.displayName,
  )
  return {
    title: `${found.service.name} · ${host}`,
    description: found.service.description ?? found.page.headline ?? undefined,
  }
}

export default async function PublicBookingServicePage({ params }: Props) {
  const found = await load(params)
  if (!found) {
    notFound()
  }
  return <BookingFlow page={found.page} service={found.service} />
}
