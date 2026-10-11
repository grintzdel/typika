import { expect, test } from '@playwright/test'

test.describe('home', () => {
  test('lists the embedded templates, without their bases', async ({ page }) => {
    await page.goto('/')

    const list = page.getByRole('list', { name: 'Templates' })
    await expect(list.getByRole('link', { name: /Observer: reacting to an order.*TypeScript/ })).toHaveAttribute(
      'href',
      '/play/observer-ts'
    )
    await expect(list.getByRole('link', { name: /Observer: reacting to an order.*JavaScript/ })).toHaveAttribute(
      'href',
      '/play/observer-js'
    )
    await expect(list.getByRole('link', { name: /Strategy: shipping options.*Kotlin/ })).toHaveAttribute(
      'href',
      '/play/strategy-kotlin'
    )
    await expect(list.getByRole('link', { name: /base:/i })).toHaveCount(0)
  })

  test('opens a template from the list', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: /Decorator: sending notifications/ }).click()

    await expect(page).toHaveURL('/play/decorator-ts')
    await expect(page.getByRole('tree', { name: 'Fichiers' })).toBeVisible()
  })
})
