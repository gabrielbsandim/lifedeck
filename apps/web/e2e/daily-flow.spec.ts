import { expect, test } from '@playwright/test'

test('a guest can onboard, add a task, and complete it', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Get started' })).toBeVisible()

  await page.getByLabel('Your name').fill('Gabriel')
  await page.getByRole('button', { name: 'Start' }).click()

  const addTask = page.getByLabel('Add a task')
  await expect(addTask).toBeVisible()

  await addTask.fill('Buy flowers')
  await addTask.press('Enter')

  await expect(page.getByText('Buy flowers')).toBeVisible()

  await page.getByRole('checkbox', { name: 'Buy flowers' }).click()

  await expect(page.getByText('100%')).toBeVisible()
})

test('the public API reference renders', async ({ page }) => {
  await page.goto('/docs')
  await expect(page).toHaveTitle(/Lifedeck API Reference/)
})
