import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import {
  BookingPage,
  BookingService,
  CalendarEvent,
  User,
  asEntityId,
} from '@lifedeck/domain'
import {
  PrismaAvailabilityRepository,
  PrismaCalendarEventRepository,
  PrismaBookingPageRepository,
  PrismaBookingServiceRepository,
  PrismaUserRepository,
  prisma,
} from '@lifedeck/infrastructure'

// Booking runs behind its feature flag; the server under test must have
// FEATURES_V2 and FEATURE_BOOKING on (see playwright.config.ts).
const slug = `e2e-${Date.now().toString(36)}`
const ownerId = asEntityId(randomUUID())
const serviceId = asEntityId(randomUUID())

test.use({ timezoneId: 'America/Sao_Paulo' })

test.beforeAll(async () => {
  const now = new Date()
  await new PrismaUserRepository(prisma).save(
    User.createGuest({
      id: ownerId,
      displayName: 'Ana Host',
      locale: 'en',
      timezone: 'UTC',
      createdAt: now,
    }),
  )
  await prisma.subscription.create({
    data: {
      userId: ownerId,
      plan: 'pro',
      status: 'active',
      provider: 'stripe',
      providerRef: `e2e-${ownerId}`,
    },
  })
  const page = BookingPage.create({
    id: asEntityId(randomUUID()),
    ownerId,
    slug,
    displayName: 'Ana Host',
    headline: 'English classes',
    timezone: 'UTC',
    locale: 'en',
    now,
  })
  await new PrismaBookingPageRepository(prisma).save(page)
  await new PrismaBookingServiceRepository(prisma).save(
    BookingService.create({
      id: serviceId,
      ownerId,
      pageId: page.id,
      name: 'Trial class',
      durationMin: 30,
      minNoticeMin: 0,
      location: { kind: 'online-link', url: 'https://meet.example/ana' },
      position: 0,
      now,
    }),
  )
  await new PrismaAvailabilityRepository(prisma).replaceWeekly(
    page.id,
    [0, 1, 2, 3, 4, 5, 6].map(weekday => ({
      weekday,
      startMinute: 0,
      endMinute: 1440,
    })),
  )
})

test.afterAll(async () => {
  await prisma.user.delete({ where: { id: ownerId } })
  await prisma.$disconnect()
})

test('a client books, gets the email and cancels through the link', async ({
  page,
  request,
}) => {
  await page.goto(`/b/${slug}`)
  await expect(page.getByRole('heading', { name: 'Ana Host' })).toBeVisible()
  await page.getByRole('link', { name: /Trial class/ }).click()

  await expect(page.getByLabel('Time zone')).toHaveValue('America/Sao_Paulo')
  await page.getByRole('tab').nth(1).click()
  await page
    .getByRole('button', { name: /^\d\d:\d\d/ })
    .first()
    .click()

  await page.getByLabel('Name').fill('João Client')
  await page.getByLabel('Email').fill('joao@example.com')
  await page.getByRole('button', { name: 'Book' }).click()

  await expect(
    page.getByRole('heading', { name: 'You are booked' }),
  ).toBeVisible()
  await expect(page.getByText('joao@example.com')).toBeVisible()

  const booking = await prisma.booking.findFirstOrThrow({
    where: { ownerId },
  })
  expect(booking.status).toBe('confirmed')
  expect(booking.clientTimezone).toBe('America/Sao_Paulo')
  expect(booking.calendarEventId).not.toBeNull()

  const dispatched = await request.post('/api/v1/internal/dispatch-jobs', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
  expect(dispatched.ok()).toBe(true)
  const notice = await prisma.scheduledJob.findFirstOrThrow({
    where: {
      type: 'booking-notice',
      payload: { path: ['bookingId'], equals: booking.id },
    },
  })
  expect(notice.status).toBe('done')

  await page.getByRole('link', { name: 'Reschedule or cancel' }).click()
  await expect(page.getByText('Confirmed')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel booking' }).click()
  await page.getByLabel('Reason (optional)').fill('Something came up')
  await page.getByRole('button', { name: 'Yes, cancel' }).click()

  await expect(page.getByText('Cancelled')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Cancel booking' }),
  ).toHaveCount(0)
  const cancelled = await prisma.booking.findUniqueOrThrow({
    where: { id: booking.id },
  })
  expect(cancelled).toMatchObject({
    status: 'cancelled',
    cancelReason: 'Something came up',
  })
})

test('an unknown booking page renders the 404', async ({ page }) => {
  const response = await page.goto('/b/nobody-here-e2e')
  expect(response?.status()).toBe(404)
})

test('a busy calendar event blocks its slot, a free one does not', async ({
  request,
}) => {
  type Slot = { startsAt: string; endsAt: string }
  const from = new Date(Date.now() + 2 * 86_400_000)
  const query = new URLSearchParams({
    serviceId,
    from: from.toISOString(),
    to: new Date(from.getTime() + 86_400_000).toISOString(),
  })
  const slots = async (): Promise<string[]> => {
    const response = await request.get(
      `/api/v1/public/booking/${slug}/slots?${query}`,
    )
    expect(response.ok()).toBe(true)
    const { data } = (await response.json()) as { data: Slot[] }
    return data.map(slot => slot.startsAt)
  }
  const before = await slots()
  const [busyAt, freeAt] = [before[4]!, before[10]!]
  const events = new PrismaCalendarEventRepository(prisma)
  for (const [startsAt, busy] of [
    [busyAt, true],
    [freeAt, false],
  ] as const) {
    const start = new Date(startsAt)
    await events.save(
      CalendarEvent.create({
        id: asEntityId(randomUUID()),
        ownerId,
        title: busy ? 'Cambly class' : 'Shown as free',
        startsAt: start,
        endsAt: new Date(start.getTime() + 30 * 60_000),
        busy,
        now: new Date(),
      }),
    )
  }
  const after = await slots()
  expect(after).not.toContain(busyAt)
  expect(after).toContain(freeAt)
})

test.describe('on a 360 px phone', () => {
  test.use({ viewport: { width: 360, height: 740 } })

  test('the page and the slot picker fit the screen', async ({ page }) => {
    const overflow = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      )
    await page.goto(`/b/${slug}`)
    await expect(page.getByRole('heading', { name: 'Ana Host' })).toBeVisible()
    expect(await overflow()).toBeLessThanOrEqual(0)
    await page.getByRole('link', { name: /Trial class/ }).click()
    await expect(page.getByRole('tab').first()).toBeVisible()
    expect(await overflow()).toBeLessThanOrEqual(0)
  })
})
