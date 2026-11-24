import type { PublicBookingPageView } from '@/dtos/booking-dto'
import type { PublicPageLoader } from '@/shared/booking-context'

type Dependencies = {
  loader: PublicPageLoader
}

// The location detail (link, address) is withheld until the client books.
export function makeGetPublicBookingPage({ loader }: Dependencies) {
  return async function getPublicBookingPage(
    slug: string,
  ): Promise<PublicBookingPageView> {
    const page = await loader.page(slug)
    const services = await loader.activeServices(page)
    const props = page.toJSON()
    return {
      slug: props.slug,
      displayName: props.displayName,
      headline: props.headline,
      timezone: props.timezone,
      locale: props.locale,
      services: services.map(service => {
        const settings = service.toJSON()
        return {
          id: settings.id as string,
          name: settings.name,
          description: settings.description,
          durationMin: settings.durationMin,
          locationKind: settings.location.kind,
          priceLabel: settings.priceLabel,
          requiresApproval: settings.requiresApproval,
        }
      }),
    }
  }
}
