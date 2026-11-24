import { DEFAULT_TIME_ZONE, asEntityId, zonedIso } from '@lifedeck/domain'
import type { BookingClientView, BookingView } from '@/dtos/booking-dto'
import { NotFoundError } from '@/errors/use-case-error'
import type {
  AssistantBookingClient,
  AssistantBookingSummary,
  BookingAssistantTools,
} from '@/ports/assistant-tools'
import type { Clock } from '@/ports/clock'
import type { UserRepository } from '@/ports/user-repository'
import { normalizeTitle } from '@/shared/activity-match'
import type { makeCancelBooking } from '@/use-cases/cancel-booking'
import type { makeCreateBookingForClient } from '@/use-cases/create-booking-for-client'
import type { makeGetBookingSetup } from '@/use-cases/get-booking-setup'
import type { makeListBookingClients } from '@/use-cases/list-booking-clients'
import type { makeListBookings } from '@/use-cases/list-bookings'
import type { makeListHostBookingSlots } from '@/use-cases/list-host-booking-slots'
import type { makeRescheduleBooking } from '@/use-cases/reschedule-booking'
import type { makeUpsertBookingClientForHost } from '@/use-cases/upsert-booking-client'

const DAY_MS = 24 * 60 * 60_000
const DEFAULT_SLOT_WINDOW_MS = 7 * DAY_MS
const DEFAULT_BOOKINGS_WINDOW_MS = 30 * DAY_MS
// Enough to pick from without flooding the model's context.
const MAX_SLOTS = 30
// A second booking of the same service for the same client inside a week is
// almost always a reschedule; weekly sessions sit exactly seven days apart.
const NEAR_DUPLICATE_MS = 7 * DAY_MS
const OPEN_STATUSES = ['pending', 'confirmed'] as const

export type BookingAssistantToolsDeps = {
  users: Pick<UserRepository, 'findById'>
  clock: Clock
  appUrl: string
  getBookingSetup: ReturnType<typeof makeGetBookingSetup>
  listBookingClients: ReturnType<typeof makeListBookingClients>
  upsertBookingClient: ReturnType<typeof makeUpsertBookingClientForHost>
  listHostBookingSlots: ReturnType<typeof makeListHostBookingSlots>
  listBookings: ReturnType<typeof makeListBookings>
  createBookingForClient: ReturnType<typeof makeCreateBookingForClient>
  cancelBooking: ReturnType<typeof makeCancelBooking>
  rescheduleBooking: ReturnType<typeof makeRescheduleBooking>
}

function toClient(view: BookingClientView): AssistantBookingClient {
  return {
    id: view.id,
    name: view.name,
    email: view.email,
    phone: view.phone,
  }
}

// Every word the user typed starts a word of the stored name, accents ignored:
// "joao" finds "João Silva", "silva" too, "joana" does not.
export function clientNameMatches(query: string, name: string): boolean {
  const wanted = normalizeTitle(query).split(' ').filter(Boolean)
  const words = normalizeTitle(name).split(' ')
  return (
    wanted.length > 0 &&
    wanted.every(token => words.some(word => word.startsWith(token)))
  )
}

export function makeBookingAssistantTools(
  deps: BookingAssistantToolsDeps,
): BookingAssistantTools {
  const toUtcIso = (value: string): string => new Date(value).toISOString()

  const timezoneOf = async (userId: string): Promise<string> => {
    const user = await deps.users.findById(asEntityId(userId))
    return user?.timezone ?? DEFAULT_TIME_ZONE
  }

  const summarize = (
    view: BookingView,
    timezone: string,
  ): AssistantBookingSummary => ({
    id: view.id,
    title: [view.serviceName, view.client?.name].filter(Boolean).join(' · '),
    serviceId: view.serviceId,
    serviceName: view.serviceName,
    clientId: view.client?.id ?? '',
    clientName: view.client?.name ?? null,
    startsAt: zonedIso(new Date(view.startsAt), timezone),
    endsAt: zonedIso(new Date(view.endsAt), timezone),
    status: view.status,
  })

  const matchingClients = async (userId: string, query: string) => {
    const all = await deps.listBookingClients(userId)
    const needle = query.trim().toLowerCase()
    const digits = needle.replace(/\D/g, '')
    return all
      .filter(
        client =>
          clientNameMatches(query, client.name) ||
          (needle.includes('@') && client.email === needle) ||
          (digits.length >= 4 && (client.phone ?? '').includes(digits)),
      )
      .map(toClient)
  }

  const requirePage = async (userId: string) => {
    const setup = await deps.getBookingSetup(userId)
    if (!setup.page) {
      throw new NotFoundError('Booking page')
    }
    return {
      page: setup.page,
      services: setup.services.filter(service => service.active),
    }
  }

  return {
    async findClient(userId, query) {
      return { clients: await matchingClients(userId, query) }
    },

    async addClient(userId, input) {
      const matches = input.confirmedNew
        ? []
        : await matchingClients(userId, input.name)
      if (matches.length > 0) {
        return { added: false, id: null, name: input.name, matches }
      }
      const client = await deps.upsertBookingClient(userId, {
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
      })
      return { added: true, id: client.id, name: client.name, matches: [] }
    },

    async listBookingSlots(userId, input) {
      const { services } = await requirePage(userId)
      const offered = services.map(service => ({
        id: service.id,
        name: service.name,
        durationMin: service.durationMin,
      }))
      const serviceId =
        input.serviceId ?? (offered.length === 1 ? offered[0]!.id : null)
      if (!serviceId) {
        return { services: offered, serviceId: null, slots: [] }
      }
      const from = input.from
        ? toUtcIso(input.from)
        : deps.clock.now().toISOString()
      const to = input.to
        ? toUtcIso(input.to)
        : new Date(Date.parse(from) + DEFAULT_SLOT_WINDOW_MS).toISOString()
      const [timezone, slots] = await Promise.all([
        timezoneOf(userId),
        deps.listHostBookingSlots(userId, { serviceId, from, to }),
      ])
      return {
        services: offered,
        serviceId,
        slots: slots.slice(0, MAX_SLOTS).map(slot => ({
          startsAt: zonedIso(new Date(slot.startsAt), timezone),
          endsAt: zonedIso(new Date(slot.endsAt), timezone),
        })),
      }
    },

    async bookForClient(userId, input) {
      const timezone = await timezoneOf(userId)
      const startsAt = new Date(input.startsAt)
      if (!input.alsoKeepExisting) {
        const now = deps.clock.now().getTime()
        const nearby = await deps.listBookings(userId, {
          from: new Date(startsAt.getTime() - NEAR_DUPLICATE_MS).toISOString(),
          to: new Date(startsAt.getTime() + NEAR_DUPLICATE_MS).toISOString(),
          status: [...OPEN_STATUSES],
        })
        const existing = nearby.filter(
          view =>
            view.client?.id === input.clientId &&
            view.serviceId === input.serviceId &&
            Date.parse(view.startsAt) >= now &&
            Math.abs(Date.parse(view.startsAt) - startsAt.getTime()) <
              NEAR_DUPLICATE_MS,
        )
        if (existing.length > 0) {
          return {
            booked: false,
            existing: existing.map(view => summarize(view, timezone)),
          }
        }
      }
      const view = await deps.createBookingForClient(
        userId,
        {
          clientId: input.clientId,
          serviceId: input.serviceId,
          startsAt: startsAt.toISOString(),
          note: input.note ?? undefined,
        },
        'assistant',
      )
      return { booked: true, existing: [], ...summarize(view, timezone) }
    },

    async listMyBookings(userId, query) {
      const now = deps.clock.now().getTime()
      const from = query.from
        ? toUtcIso(query.from)
        : new Date(now - DAY_MS).toISOString()
      const to = query.to
        ? toUtcIso(query.to)
        : new Date(Date.parse(from) + DEFAULT_BOOKINGS_WINDOW_MS).toISOString()
      const [timezone, views] = await Promise.all([
        timezoneOf(userId),
        deps.listBookings(userId, {
          from,
          to,
          status: query.includeClosed ? undefined : [...OPEN_STATUSES],
        }),
      ])
      return {
        bookings: views
          .filter(view => !query.clientId || view.client?.id === query.clientId)
          .map(view => summarize(view, timezone)),
      }
    },

    async cancelBooking(userId, input) {
      await deps.cancelBooking(userId, input.bookingId, {
        reason: input.reason ?? undefined,
      })
      return { ok: true }
    },

    async rescheduleBooking(userId, input) {
      const [timezone, view] = await Promise.all([
        timezoneOf(userId),
        deps.rescheduleBooking(userId, input.bookingId, {
          startsAt: toUtcIso(input.startsAt),
        }),
      ])
      return { ok: true, ...summarize(view, timezone) }
    },

    async shareBookingLink(userId) {
      const { page, services } = await requirePage(userId)
      const url = `${deps.appUrl.replace(/\/$/, '')}/b/${page.slug}`
      return {
        url,
        active: page.active,
        services: services.map(service => ({
          name: service.name,
          url: `${url}/${service.id}`,
        })),
      }
    },
  }
}
