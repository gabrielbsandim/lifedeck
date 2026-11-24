import { expect, test, type Page } from '@playwright/test'
import { prisma } from '@lifedeck/infrastructure'

// Runs with FEATURES_V2, FEATURE_BOOKING and FEATURE_CALENDAR on (see
// playwright.config.ts); the host is a guest upgraded to Pro in the database.
const owners: string[] = []

test.use({ timezoneId: 'America/Sao_Paulo' })

async function proGuest(page: Page, name: string): Promise<string> {
  await page.goto('/')
  await page.getByLabel('Your name').fill(name)
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.getByLabel('Add a task')).toBeVisible()
  const me = await page.request.get('/api/v1/sessions/me')
  const { data } = (await me.json()) as { data: { id: string } }
  owners.push(data.id)
  await prisma.subscription.create({
    data: {
      userId: data.id,
      plan: 'pro',
      status: 'active',
      provider: 'stripe',
      providerRef: `e2e-${data.id}`,
    },
  })
  return data.id
}

async function runWizard(page: Page, slug: string) {
  await page.goto('/booking')
  await expect(
    page.getByRole('heading', { name: 'Set up your booking page' }),
  ).toBeVisible()
  await page.getByLabel('Link', { exact: true }).fill(slug)
  await expect(page.getByText('This link is free')).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()

  await page.getByLabel('Name', { exact: true }).fill('Trial class')
  await page.getByRole('button', { name: 'Next' }).click()

  await expect(page.getByText('Step 3 of 3')).toBeVisible()
  await page.getByRole('button', { name: 'Publish page' }).click()
  await expect(page.getByText('Your booking link')).toBeVisible()
}

test.afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: owners } } })
  await prisma.$disconnect()
})

test('a host publishes a page, gets a booking and sees it in the calendar', async ({
  page,
}) => {
  const slug = `host-${Date.now().toString(36)}`
  const ownerId = await proGuest(page, 'Bia Host')
  await runWizard(page, slug)
  await expect(page.getByText(`/b/${slug}`)).toBeVisible()

  const service = await prisma.bookingService.findFirstOrThrow({
    where: { ownerId },
  })
  expect(service).toMatchObject({ name: 'Trial class', durationMin: 30 })
  expect(
    await prisma.availabilityRule.count({
      where: { page: { ownerId } },
    }),
  ).toBe(5)

  const visitor = await page.context().browser()!.newPage()
  await visitor.goto(`/b/${slug}`)
  await expect(visitor.getByRole('heading', { name: 'Bia Host' })).toBeVisible()
  await expect(visitor.getByRole('link', { name: /Trial class/ })).toBeVisible()

  const from = new Date()
  const query = new URLSearchParams({
    serviceId: service.id,
    from: from.toISOString(),
    to: new Date(from.getTime() + 7 * 86_400_000).toISOString(),
  })
  const slots = await visitor.request.get(
    `/api/v1/public/booking/${slug}/slots?${query}`,
  )
  const { data } = (await slots.json()) as { data: { startsAt: string }[] }
  const booked = await visitor.request.post(
    `/api/v1/public/booking/${slug}/requests`,
    {
      data: {
        serviceId: service.id,
        startsAt: data[0]!.startsAt,
        name: 'João Client',
        email: 'joao.host-e2e@example.com',
        website: '',
      },
    },
  )
  expect(booked.status()).toBe(201)
  await visitor.close()

  await page.reload()
  await expect(page.getByText('Trial class · João Client')).toBeVisible()

  await page.goto('/calendar')
  const title = 'Trial class with João Client'
  await page.getByRole('button', { name: title, exact: true }).first().click()
  const sheet = page.getByRole('dialog', { name: title })
  await expect(sheet.getByRole('link', { name: 'Booking' })).toBeVisible()
})

test.describe('on a 360 px phone', () => {
  test.use({ viewport: { width: 360, height: 740 } })

  test('the setup wizard and the dashboard fit the screen', async ({
    page,
  }) => {
    const overflow = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      )
    await proGuest(page, 'Caio Phone')
    await page.goto('/booking')
    await expect(page.getByText('Step 1 of 3')).toBeVisible()
    expect(await overflow()).toBeLessThanOrEqual(0)
    await runWizard(page, `phone-${Date.now().toString(36)}`)
    expect(await overflow()).toBeLessThanOrEqual(0)
    for (const name of ['Services', 'Hours', 'Clients', 'Page']) {
      const tab = page.getByRole('tab', { name, exact: true })
      await tab.click()
      await expect(tab).toHaveAttribute('aria-selected', 'true')
      expect(await overflow()).toBeLessThanOrEqual(0)
    }
  })
})
