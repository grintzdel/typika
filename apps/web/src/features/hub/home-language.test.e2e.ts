import { expect, test } from '@playwright/test'

test.use({ locale: 'en-US' })

test.describe('language', () => {
  test('translates the hub and the sandbox, and keeps the choice after a reload', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')

    await page.getByRole('combobox', { name: 'Language' }).selectOption('fr')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText("Apprenez l'architecture en exécutant du code.")
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr')

    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("Apprenez l'architecture en exécutant du code.")

    await page.goto('/play/strategy-ts')
    await expect(page.getByRole('button', { name: 'Réinitialiser' })).toBeVisible()

    await page.getByRole('combobox', { name: 'Langue' }).selectOption('en')

    await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible()
    await page.goto('/')
    await expect(page.getByRole('combobox', { name: 'Language' })).toHaveValue('en')
  })

  test('says in French that the template content is in English, with French dates', async ({ page }) => {
    await page.goto('/templates/strategy-ts')
    await expect(page.getByText('Template content is in English.')).toHaveCount(0)

    await page.getByRole('combobox', { name: 'Language' }).selectOption('fr')

    await expect(page.getByText('Le contenu des templates est en anglais.')).toBeVisible()
    await expect(page.getByRole('region', { name: 'À propos' }).locator('time')).toHaveText('12 octobre 2026')
  })
})
