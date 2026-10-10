import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

const STRATEGY_DIR = join(import.meta.dirname, '..', '..', '..', '..', '..', 'templates', 'strategy', 'ts')

const openStrategy = async (page: Page) => {
  await page.goto('/play/strategy-ts')
  await expect(page.getByRole('tree', { name: 'Fichiers' })).toBeVisible()
}

const editor = (page: Page) => page.getByRole('textbox', { name: 'Éditeur' })

test.describe('template sandbox', () => {
  test('opens the Strategy template on its entry file', async ({ page }) => {
    await openStrategy(page)

    await expect(page.getByRole('treeitem', { name: 'main.ts' })).toHaveAttribute('aria-selected', 'true')
    await expect(editor(page)).toContainText("import { quoteShipping } from './checkout/checkout.ts'")
  })

  test('opens another file from the tree', async ({ page }) => {
    await openStrategy(page)

    await page.getByRole('treeitem', { name: 'standard.ts' }).click()

    await expect(editor(page)).toContainText('export class StandardShipping implements ShippingCost')
  })

  test('runs the tests of the template green', async ({ page }) => {
    await openStrategy(page)

    await page.getByRole('button', { name: 'Tests', exact: true }).click()

    const results = page.getByRole('region', { name: 'Résultats des tests' })
    await expect(results.getByText(/^\d+ réussis$/)).toBeVisible({ timeout: 30_000 })
    await expect(results.getByText('0 échec')).toBeVisible()
    await expect(results.getByText('charges 4.90 for orders up to 2 kg')).toBeVisible()
  })

  test('runs the entry and shows its output in the console', async ({ page }) => {
    await openStrategy(page)

    await page.getByRole('button', { name: 'Exécuter' }).click()

    const console = page.getByRole('region', { name: 'Console' })
    await expect(console.getByText(/Ada \(regular\)/)).toBeVisible({ timeout: 30_000 })
    await expect(console.getByText('Terminé avec le code 0')).toBeVisible()
  })

  test('reports a failing test after an edit', async ({ page }) => {
    const source = await readFile(join(STRATEGY_DIR, 'src', 'checkout', 'options', 'standard.ts'), 'utf8')
    await openStrategy(page)
    await page.getByRole('treeitem', { name: 'standard.ts' }).click()

    await editor(page).click()
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.insertText(source.replace('money(490)', 'money(500)'))
    await page.getByRole('button', { name: 'Tests', exact: true }).click()

    const results = page.getByRole('region', { name: 'Résultats des tests' })
    await expect(results.getByText('2 échecs')).toBeVisible({ timeout: 30_000 })
    const failed = results.getByRole('listitem').filter({ hasText: 'charges 4.90 for orders up to 2 kg' })
    await expect(failed).toContainText("expected { cents: 500, currency: 'EUR' }")
  })

  test('runs user code in an isolated frame on another origin', async ({ page }) => {
    await openStrategy(page)
    await page.getByRole('button', { name: 'Exécuter' }).click()
    await expect(page.getByRole('region', { name: 'Console' }).getByText(/Ada/)).toBeVisible({ timeout: 30_000 })

    const frame = page.frames().find((candidate) => candidate.url().includes('/runtime/frame.html'))
    expect(frame).toBeDefined()
    expect(new URL(frame?.url() ?? '').origin).not.toBe(new URL(page.url()).origin)
    expect(await frame?.evaluate(() => self.crossOriginIsolated)).toBe(true)
  })
})
