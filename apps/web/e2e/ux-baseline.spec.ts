import { expect, test, type Page } from '@playwright/test'

async function onboard(page: Page, name = 'Gabriel') {
  await page.getByLabel('Your name').fill(name)
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.getByLabel('Add a task')).toBeVisible()
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
}

test('an unknown route renders the branded 404', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist')

  expect(response?.status()).toBe(404)
  await expect(
    page.getByRole('heading', { name: 'Page not found' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to Today' })).toBeVisible()
})

test('a failed save shows the error toast', async ({ page }) => {
  await page.goto('/')
  await onboard(page)

  await page.route('**/api/v1/tasks', route =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 500,
          json: { error: { code: 'INTERNAL_ERROR', message: 'boom' } },
        })
      : route.continue(),
  )
  const addTask = page.getByLabel('Add a task')
  await addTask.fill('Buy flowers')
  await addTask.press('Enter')

  const toast = page.getByRole('alert').filter({
    hasText: "Couldn't save that change. Try again.",
  })
  await expect(toast).toBeVisible()
  await toast.getByRole('button', { name: 'Dismiss' }).click()
  await expect(toast).toBeHidden()
})

test('signing in returns to the page that asked for it', async ({ page }) => {
  await page.goto('/habits')

  await expect(page).toHaveURL(/\/\?returnTo=%2Fhabits$/)
  await page.getByLabel('Your name').fill('Returning')
  await page.getByRole('button', { name: 'Start' }).click()

  await expect(page).toHaveURL(/\/habits$/)
  await expect(page.getByRole('heading', { name: 'Habits' })).toBeVisible()
})

test.describe('on a 360 px phone', () => {
  test.use({ viewport: { width: 360, height: 740 } })

  test('the tab bar reaches Habits directly and marks it active', async ({
    page,
  }) => {
    await page.goto('/')
    await onboard(page, 'Phone')
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)

    const tabs = page.getByRole('navigation', { name: 'Menu' })
    await tabs.getByRole('link', { name: 'Habits' }).click()

    await expect(page).toHaveURL(/\/habits$/)
    await expect(tabs.getByRole('link', { name: 'Habits' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  })

  test('the 404 fits the screen', async ({ page }) => {
    await page.goto('/missing')

    await expect(
      page.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible()
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  })
})
