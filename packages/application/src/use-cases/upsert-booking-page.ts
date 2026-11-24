import {
  BookingPage,
  ValidationError,
  asEntityId,
  validateBookingSlug,
} from '@lifedeck/domain'
import {
  upsertBookingPageSchema,
  type BookingPageView,
  type UpsertBookingPageInput,
} from '@/dtos/booking-dto'
import { NotFoundError } from '@/errors/use-case-error'
import { toBookingPageView } from '@/mappers/booking-mapper'
import type { BookingPageRepository } from '@/ports/booking-page-repository'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { UserRepository } from '@/ports/user-repository'

type Dependencies = {
  pages: BookingPageRepository
  users: Pick<UserRepository, 'findById'>
  ids: IdGenerator
  clock: Clock
}

export function makeUpsertBookingPage({
  pages,
  users,
  ids,
  clock,
}: Dependencies) {
  return async function upsertBookingPage(
    ownerId: string,
    input: UpsertBookingPageInput,
  ): Promise<BookingPageView> {
    const { active, ...data } = upsertBookingPageSchema.parse(input)
    const owner = asEntityId(ownerId)
    const slug = validateBookingSlug(data.slug)
    const holder = await pages.findBySlug(slug)
    if (holder && holder.ownerId !== owner) {
      throw new ValidationError('That link is already taken.')
    }

    const existing = await pages.findByOwner(owner)
    const now = clock.now()
    if (existing) {
      existing.update({ ...data, slug }, now)
      if (active !== undefined) {
        existing.setActive(active, now)
      }
      await pages.save(existing)
      return toBookingPageView(existing)
    }

    const user = await users.findById(owner)
    if (!user) {
      throw new NotFoundError('User')
    }
    const page = BookingPage.create({
      id: ids.generate(),
      ownerId: owner,
      slug,
      displayName: data.displayName ?? user.displayName,
      headline: data.headline,
      timezone: data.timezone ?? user.timezone,
      locale: data.locale ?? user.locale,
      now,
    })
    page.update({ cancelNoticeMin: data.cancelNoticeMin }, now)
    if (active === false) {
      page.setActive(false, now)
    }
    await pages.save(page)
    return toBookingPageView(page)
  }
}
