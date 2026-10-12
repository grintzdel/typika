import { expect, test } from '@playwright/test'

test.describe('template page', () => {
  test('presents the template, its tour, its base and its exercises', async ({ page }) => {
    await page.goto('/templates/strategy-ts')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Strategy: shipping options')
    await expect(
      page.getByRole('navigation', { name: "Fil d'Ariane" }).getByRole('link', { name: 'Templates' })
    ).toHaveAttribute('href', '/templates')
    await expect(page.getByRole('link', { name: 'Ouvrir dans la sandbox' })).toHaveAttribute(
      'href',
      '/play/strategy-ts'
    )
    await expect(page.getByRole('region', { name: 'Ce que vous allez voir' }).getByRole('listitem')).toHaveCount(6)
    await expect(page.getByRole('region', { name: 'Avant / après' })).toContainText('strategy-base-ts')
    const exercises = page.getByRole('region', { name: 'Exercices' })
    await expect(exercises.getByRole('link', { name: /Implement the express shipping strategy/ })).toHaveAttribute(
      'href',
      '/play/strategy-ts?exercise=implement-express'
    )
  })

  test('switches to another language through its variants', async ({ page }) => {
    await page.goto('/templates/strategy-ts')
    const languages = page.getByRole('navigation', { name: 'Langage' })
    await expect(languages.getByRole('link', { name: 'TypeScript' })).toHaveAttribute('aria-current', 'page')

    await languages.getByRole('link', { name: 'Kotlin' }).click()

    await expect(page).toHaveURL('/templates/strategy-kotlin')
    await expect(languages.getByRole('link', { name: 'Kotlin' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('region', { name: 'Avant / après' })).toContainText('strategy-base-kotlin')
  })

  test('opens the sandbox on the diff from the base', async ({ page }) => {
    await page.goto('/templates/observer-ts')

    await page.getByRole('link', { name: 'Voir le diff' }).click()

    await expect(page).toHaveURL('/play/observer-ts?panel=diff')
    await expect(page.getByRole('tabpanel', { name: 'Diff' })).toBeVisible()
  })

  test('says when no template has that name', async ({ page }) => {
    await page.goto('/templates/does-not-exist')

    await expect(page.getByText('Aucun template ne s’appelle « does-not-exist ».')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Voir tous les templates' })).toHaveAttribute('href', '/templates')
  })
})
