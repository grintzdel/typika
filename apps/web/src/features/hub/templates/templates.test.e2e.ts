import { expect, test, type Page } from '@playwright/test'

const results = (page: Page) => page.getByRole('list', { name: 'Templates' })
const facet = (page: Page, name: string) => page.getByRole('group', { name })

test.describe('templates list', () => {
  test('lists every template, without the bases', async ({ page }) => {
    await page.goto('/templates')

    await expect(results(page).getByRole('listitem')).toHaveCount(21)
    await expect(results(page).getByRole('link', { name: /Strategy: shipping options.*Kotlin/ })).toHaveAttribute(
      'href',
      '/templates/strategy-kotlin'
    )
    await expect(results(page).locator('a[href*="-base-"]')).toHaveCount(0)
  })

  test('keeps its filters in the query string, across a reload and the back button', async ({ page }) => {
    await page.goto('/templates')
    await expect(results(page).getByRole('listitem')).toHaveCount(21)

    await facet(page, 'Langage').getByRole('checkbox', { name: 'Go' }).check()

    await expect(page).toHaveURL('/templates?language=go')
    await expect(results(page).getByRole('listitem')).toHaveCount(1)
    await page.reload()
    await expect(facet(page, 'Langage').getByRole('checkbox', { name: 'Go' })).toBeChecked()
    await expect(results(page).getByRole('link', { name: /Strategy: shipping options.*Go/ })).toBeVisible()
    await expect(results(page).getByRole('listitem')).toHaveCount(1)
    await page.goBack()
    await expect(results(page).getByRole('listitem')).toHaveCount(21)
  })

  test('filters by a branch of the topic tree', async ({ page }) => {
    await page.goto('/templates?topic=design-pattern/behavioral&language=typescript')

    await expect(facet(page, 'Sujet').getByRole('checkbox', { name: 'Comportement' })).toBeChecked()
    await expect(results(page).getByRole('listitem')).toHaveCount(2)
    await expect(results(page).getByRole('link', { name: /^Strategy/ })).toBeVisible()
    await expect(results(page).getByRole('link', { name: /^Observer/ })).toBeVisible()
  })

  test('shows an empty state that removes its filters one by one', async ({ page }) => {
    await page.goto('/templates?language=go&level=beginner')

    await expect(page.getByText('Aucun template ne correspond')).toBeVisible()
    await page.getByRole('button', { name: 'Retirer Niveau : Débutant' }).click()

    await expect(page).toHaveURL('/templates?language=go')
    await expect(results(page).getByRole('listitem')).toHaveCount(1)
    await page.goto('/templates?language=go&level=beginner')
    await page.getByRole('button', { name: 'Réinitialiser' }).click()
    await expect(page).toHaveURL('/templates')
    await expect(results(page).getByRole('listitem')).toHaveCount(21)
  })
})
