import { expect, test } from '@playwright/test'

test.describe('home', () => {
  test('shows one card per concept, grouped by category', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText("Apprenez l'architecture en exécutant du code.")
    const patterns = page.getByRole('region', { name: 'Design patterns' })
    const strategy = patterns.getByRole('link', { name: /^Strategy/ })
    await expect(strategy).toHaveAttribute('href', '/templates/strategy-ts')
    await expect(strategy).toContainText('TypeScript')
    await expect(strategy).toContainText('Go')
    await expect(strategy).toContainText('Kotlin')
    await expect(patterns.getByRole('link', { name: /^Observer/ })).toHaveAttribute('href', '/templates/observer-ts')
    await expect(
      page.getByRole('region', { name: 'Architecture' }).getByRole('link', { name: /^Hexagonal architecture/ })
    ).toHaveAttribute('href', '/templates/hexagonal-ts')
    await expect(page.getByRole('region', { name: 'Principes SOLID' }).getByRole('listitem')).toHaveCount(5)
    await expect(page.locator('a[href*="-base-"]')).toHaveCount(0)
  })

  test('links each category to the filtered list', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('region', { name: 'Architecture' }).getByRole('link', { name: 'Tout voir' }).click()

    await expect(page).toHaveURL('/templates?topic=architecture')
    await expect(page.getByRole('list', { name: 'Templates' }).getByRole('listitem')).toHaveCount(5)
  })

  test('opens the template page of a concept', async ({ page }) => {
    await page.goto('/')

    await page
      .getByRole('region', { name: 'Design patterns' })
      .getByRole('link', { name: /^Decorator/ })
      .click()

    await expect(page).toHaveURL('/templates/decorator-ts')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Decorator: sending notifications')
  })

  test('offers to resume the local projects', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('region', { name: 'Reprendre' })).toHaveCount(0)

    await page.goto('/play/strategy-ts')
    await page.getByRole('treeitem', { name: /standard\.ts/ }).click()
    await page.getByRole('textbox', { name: 'Éditeur' }).click()
    await page.keyboard.insertText('// edited\n')
    await expect(page.getByRole('status', { name: 'État du projet' })).toHaveText('Modifié')
    await page.goto('/')

    const resume = page.getByRole('region', { name: 'Reprendre' })
    await expect(resume.getByRole('link', { name: /strategy-ts/ })).toHaveAttribute('href', '/play/strategy-ts')
  })
})
