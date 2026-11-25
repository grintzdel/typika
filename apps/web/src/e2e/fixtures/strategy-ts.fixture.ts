import { expect, type Page } from '@playwright/test'

export const LANGUAGE_SERVICE_TIMEOUT = 15_000

export const editor = (page: Page) => page.getByRole('textbox', { name: 'Éditeur' })

export const openStrategy = async (page: Page) => {
  await page.goto('/play/strategy-ts')
  await expect(page.getByRole('tree', { name: 'Fichiers' })).toBeVisible()
  const symbol = editor(page).getByText('quoteShipping', { exact: true }).first()
  await expect(async () => {
    await page.mouse.move(0, 0)
    await symbol.hover()
    await expect(page.getByRole('tooltip')).toBeVisible({ timeout: 1_000 })
  }).toPass({ timeout: LANGUAGE_SERVICE_TIMEOUT })
  await page.mouse.move(0, 0)
  await expect(page.getByRole('tooltip')).toBeHidden()
}
