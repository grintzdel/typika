import { expect, test, type Page } from '@playwright/test'

const results = (page: Page) => page.getByRole('list', { name: 'Templates' })
const facet = (page: Page, name: string) => page.getByRole('group', { name })
const searchbox = (page: Page) => page.getByRole('searchbox', { name: 'Rechercher des templates' })

test.describe('templates list', () => {
  test('lists every template, without the bases', async ({ page }) => {
    await page.goto('/templates')

    await expect(results(page).getByRole('listitem')).toHaveCount(26)
    await expect(results(page).getByRole('link', { name: /Strategy: shipping options.*Kotlin/ })).toHaveAttribute(
      'href',
      '/templates/strategy-kotlin'
    )
    await expect(results(page).locator('a[href*="-base-"]')).toHaveCount(0)
  })

  test('keeps its filters in the query string, across a reload and the back button', async ({ page }) => {
    await page.goto('/templates')
    await expect(results(page).getByRole('listitem')).toHaveCount(26)

    await facet(page, 'Langage').getByRole('checkbox', { name: 'Go' }).check()

    await expect(page).toHaveURL('/templates?language=go')
    await expect(results(page).getByRole('listitem')).toHaveCount(6)
    await page.reload()
    await expect(facet(page, 'Langage').getByRole('checkbox', { name: 'Go' })).toBeChecked()
    await expect(results(page).getByRole('link', { name: /Strategy: shipping options.*Go/ })).toBeVisible()
    await expect(results(page).getByRole('listitem')).toHaveCount(6)
    await page.goBack()
    await expect(results(page).getByRole('listitem')).toHaveCount(26)
  })

  test('filters by a branch of the topic tree', async ({ page }) => {
    await page.goto('/templates?topic=design-pattern/behavioral&language=typescript')

    await expect(facet(page, 'Sujet').getByRole('checkbox', { name: 'Comportement' })).toBeChecked()
    await expect(results(page).getByRole('listitem')).toHaveCount(2)
    await expect(results(page).getByRole('link', { name: /^Strategy/ })).toBeVisible()
    await expect(results(page).getByRole('link', { name: /^Observer/ })).toBeVisible()
  })

  test('shows an empty state that removes its filters one by one', async ({ page }) => {
    await page.goto('/templates?language=go&level=advanced')

    await expect(page.getByText('Aucun template ne correspond')).toBeVisible()
    await page.getByRole('button', { name: 'Retirer Niveau : Avancé' }).click()

    await expect(page).toHaveURL('/templates?language=go')
    await expect(results(page).getByRole('listitem')).toHaveCount(6)
    await page.goto('/templates?language=go&level=advanced')
    await page.getByRole('button', { name: 'Réinitialiser' }).click()
    await expect(page).toHaveURL('/templates')
    await expect(results(page).getByRole('listitem')).toHaveCount(26)
  })

  test('finds strategy-ts by its symptom, combined with a language', async ({ page }) => {
    await page.goto('/templates')
    await expect(results(page).getByRole('listitem')).toHaveCount(26)

    await searchbox(page).pressSequentially('switch')
    await expect(page).toHaveURL('/templates?q=switch')
    await expect(searchbox(page)).toHaveValue('switch')
    await facet(page, 'Langage').getByRole('checkbox', { name: /^TypeScript/ }).check()

    await expect(page).toHaveURL('/templates?language=typescript&q=switch')
    await expect(results(page).getByRole('link', { name: /^Strategy: shipping options/ })).toHaveAttribute(
      'href',
      '/templates/strategy-ts'
    )
    await expect(page.getByRole('combobox', { name: 'Trier par' })).toHaveValue('relevance')
    await expect(facet(page, 'Langage').getByRole('checkbox', { name: /^Go \d+$/ })).toBeVisible()
  })

  test('focuses the search on "/" and sends it to the list from another page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('heading', { level: 1 }).click()

    await page.keyboard.press('/')
    await expect(searchbox(page)).toBeFocused()
    await page.keyboard.type('observer')
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL('/templates?q=observer')
    await expect(searchbox(page)).toHaveValue('observer')
    await expect(results(page).getByRole('listitem')).toHaveCount(2)
  })

  test('removes the search and the filters of an empty result one by one', async ({ page }) => {
    await page.goto('/templates?language=go&q=observer')

    await expect(page.getByText('Aucun template ne correspond')).toBeVisible()
    await page.getByRole('button', { name: 'Retirer la recherche : observer' }).click()

    await expect(page).toHaveURL('/templates?language=go')
    await expect(searchbox(page)).toHaveValue('')
    await expect(results(page).getByRole('listitem')).toHaveCount(6)
  })
})
