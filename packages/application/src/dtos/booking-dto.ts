import { z } from 'zod'
import { BOOKING_STATUSES } from '@lifedeck/domain'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const minuteOfDay = z.number().int().min(0).max(1440)
const optionalText = (max: number) => z.string().max(max).nullable().optional()

export const bookingLocationInputSchema = z.object({
  kind: z.string(),
  url: z.string().max(500).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
})

export const upsertBookingPageSchema = z.object({
  slug: z.string().max(60),
  displayName: z.string().max(120).optional(),
  headline: optionalText(300),
  timezone: z.string().max(64).optional(),
  locale: z.enum(['en', 'pt', 'es']).optional(),
  cancelNoticeMin: z.number().int().optional(),
  active: z.boolean().optional(),
})

export type UpsertBookingPageInput = z.infer<typeof upsertBookingPageSchema>

export const bookingServiceInputSchema = z.object({
  name: z.string().max(120),
  description: optionalText(2000),
  durationMin: z.number().int(),
  slotStepMin: z.number().int().optional(),
  bufferBeforeMin: z.number().int().optional(),
  bufferAfterMin: z.number().int().optional(),
  minNoticeMin: z.number().int().optional(),
  maxHorizonDays: z.number().int().optional(),
  maxPerDay: z.number().int().nullable().optional(),
  location: bookingLocationInputSchema,
  priceLabel: optionalText(60),
  requiresApproval: z.boolean().optional(),
})

export type BookingServiceInput = z.infer<typeof bookingServiceInputSchema>

export const reorderBookingServicesSchema = z.object({
  ids: z.array(z.string().uuid()).max(100),
})

export const setAvailabilitySchema = z.object({
  weekly: z
    .array(
      z.object({
        weekday: z.number().int(),
        startMinute: minuteOfDay,
        endMinute: minuteOfDay,
      }),
    )
    .max(56),
})

export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>

export const availabilityOverrideInputSchema = z.object({
  date: isoDate,
  windows: z
    .array(z.object({ startMinute: minuteOfDay, endMinute: minuteOfDay }))
    .max(8),
})

export type AvailabilityOverrideInput = z.infer<
  typeof availabilityOverrideInputSchema
>

export const bookingClientInputSchema = z.object({
  name: z.string().max(120),
  email: z.string().max(254).nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
  notes: optionalText(1000),
})

export type BookingClientInput = z.infer<typeof bookingClientInputSchema>

export const listBookingsQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  status: z.array(z.enum(BOOKING_STATUSES)).optional(),
})

export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>

export const bookingReasonSchema = z.object({
  reason: optionalText(1000),
})

export type BookingReasonInput = z.infer<typeof bookingReasonSchema>

export const rescheduleBookingSchema = z.object({
  startsAt: z.string().datetime(),
  // Host only: book outside the published hours. Overlaps stay impossible.
  overrideAvailability: z.boolean().optional(),
})

export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>

export const markBookingOutcomeSchema = z.object({
  outcome: z.enum(['completed', 'no_show']),
})

export const createBookingForClientSchema = z.object({
  serviceId: z.string().uuid(),
  clientId: z.string().uuid(),
  startsAt: z.string().datetime(),
  note: optionalText(1000),
  overrideAvailability: z.boolean().optional(),
})

export type CreateBookingForClientInput = z.infer<
  typeof createBookingForClientSchema
>

export const listBookableSlotsQuerySchema = z.object({
  serviceId: z.string().uuid(),
  from: z.string().datetime(),
  to: z.string().datetime(),
})

export type ListBookableSlotsQuery = z.infer<
  typeof listBookableSlotsQuerySchema
>

export const requestBookingSchema = z.object({
  serviceId: z.string().uuid(),
  startsAt: z.string().datetime(),
  name: z.string().max(120),
  // Required here: confirmations and the manage link travel by email.
  email: z.string().trim().min(3).max(254),
  phone: z.string().max(32).nullable().optional(),
  note: optionalText(1000),
  timezone: z.string().max(64).nullable().optional(),
})

export type RequestBookingInput = z.infer<typeof requestBookingSchema>

export const rescheduleByTokenSchema = z.object({
  startsAt: z.string().datetime(),
})

const locationViewSchema = z.object({
  kind: z.string(),
  url: z.string().optional(),
  address: z.string().optional(),
})

export const bookingPageViewSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  displayName: z.string(),
  headline: z.string().nullable(),
  timezone: z.string(),
  locale: z.string(),
  cancelNoticeMin: z.number().int(),
  active: z.boolean(),
})

export type BookingPageView = z.infer<typeof bookingPageViewSchema>

export const bookingServiceViewSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  durationMin: z.number().int(),
  slotStepMin: z.number().int(),
  bufferBeforeMin: z.number().int(),
  bufferAfterMin: z.number().int(),
  minNoticeMin: z.number().int(),
  maxHorizonDays: z.number().int(),
  maxPerDay: z.number().int().nullable(),
  location: locationViewSchema,
  priceLabel: z.string().nullable(),
  requiresApproval: z.boolean(),
  active: z.boolean(),
  position: z.number().int(),
})

export type BookingServiceView = z.infer<typeof bookingServiceViewSchema>

const weeklyWindowViewSchema = z.object({
  weekday: z.number().int(),
  startMinute: z.number().int(),
  endMinute: z.number().int(),
})

const overrideViewSchema = z.object({
  date: z.string(),
  windows: z.array(
    z.object({ startMinute: z.number().int(), endMinute: z.number().int() }),
  ),
})

export const bookingSetupViewSchema = z.object({
  page: bookingPageViewSchema.nullable(),
  services: z.array(bookingServiceViewSchema),
  weekly: z.array(weeklyWindowViewSchema),
  overrides: z.array(overrideViewSchema),
})

export type BookingSetupView = z.infer<typeof bookingSetupViewSchema>

// `available`: the plan lacks booking and no trial was ever started.
export const bookingTrialViewSchema = z.object({
  available: z.boolean(),
  active: z.boolean(),
  endsAt: z.string().datetime().nullable(),
})

export type BookingTrialView = z.infer<typeof bookingTrialViewSchema>

export const slugAvailabilityViewSchema = z.object({
  slug: z.string(),
  available: z.boolean(),
  reason: z.enum(['invalid', 'reserved', 'taken']).nullable(),
})

export type SlugAvailabilityView = z.infer<typeof slugAvailabilityViewSchema>

export const bookingClientViewSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
})

export type BookingClientView = z.infer<typeof bookingClientViewSchema>

export const bookingViewSchema = z.object({
  id: z.string().uuid(),
  serviceId: z.string().uuid(),
  serviceName: z.string().nullable(),
  client: bookingClientViewSchema.nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: z.enum(BOOKING_STATUSES),
  source: z.string(),
  calendarEventId: z.string().uuid().nullable(),
  clientTimezone: z.string().nullable(),
  note: z.string().nullable(),
  cancelReason: z.string().nullable(),
  createdAt: z.string().datetime(),
})

export type BookingView = z.infer<typeof bookingViewSchema>

export const bookableSlotViewSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
})

export type BookableSlotView = z.infer<typeof bookableSlotViewSchema>

export const publicBookingServiceViewSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  durationMin: z.number().int(),
  locationKind: z.string(),
  priceLabel: z.string().nullable(),
  requiresApproval: z.boolean(),
})

export const publicBookingPageViewSchema = z.object({
  slug: z.string(),
  displayName: z.string(),
  headline: z.string().nullable(),
  timezone: z.string(),
  locale: z.string(),
  services: z.array(publicBookingServiceViewSchema),
})

export type PublicBookingPageView = z.infer<typeof publicBookingPageViewSchema>

export const bookingRequestResultSchema = z.object({
  bookingId: z.string().uuid(),
  status: z.enum(BOOKING_STATUSES),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  manageToken: z.string(),
})

export type BookingRequestResult = z.infer<typeof bookingRequestResultSchema>

export const managedBookingViewSchema = z.object({
  status: z.enum(BOOKING_STATUSES),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  serviceId: z.string().uuid(),
  serviceName: z.string(),
  durationMin: z.number().int(),
  hostName: z.string(),
  slug: z.string(),
  pageTimezone: z.string(),
  clientName: z.string(),
  clientTimezone: z.string().nullable(),
  location: locationViewSchema,
  // False once the booking no longer holds its slot or the notice has passed.
  canChange: z.boolean(),
})

export type ManagedBookingView = z.infer<typeof managedBookingViewSchema>
