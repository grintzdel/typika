import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

const STANDARD_SOURCE = join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  'templates',
  'strategy',
  'ts',
  'src',
  'checkout',
  'options',
  'standard.ts'
)

const openStrategy = async (page: Page) => {
  await page.goto('/play/strategy-ts')
  await expect(page.getByRole('tree', { name: 'Fichiers' })).toBeVisible()
}

const editor = (page: Page) => page.getByRole('textbox', { name: 'Éditeur' })
const status = (page: Page) => page.getByRole('status', { name: 'État du projet' })

const breakStandardShipping = async (page: Page) => {
  const source = await readFile(STANDARD_SOURCE, 'utf8')
  await page.getByRole('treeitem', { name: /standard\.ts/ }).click()
  await editor(page).click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.insertText(source.replace('money(490)', 'money(500)'))
  await expect(status(page)).toHaveText('Modifié')
}

const runTests = async (page: Page) => {
  await page.getByRole('button', { name: 'Tests', exact: true }).click()
  return page.getByRole('region', { name: 'Résultats des tests' })
}

test.describe('project persistence', () => {
  test('keeps the edits of a template after a reload', async ({ page }) => {
    await openStrategy(page)
    await breakStandardShipping(page)

    await page.reload()
    await expect(page.getByRole('tree', { name: 'Fichiers' })).toBeVisible()

    await expect(status(page)).toHaveText('Modifié')
    await expect(page.getByRole('treeitem', { name: 'standard.ts, modifié' })).toBeVisible()
    await page.getByRole('treeitem', { name: /standard\.ts/ }).click()
    await expect(editor(page)).toContainText('money(500)')
    await expect((await runTests(page)).getByText('2 échecs')).toBeVisible({ timeout: 30_000 })
  })

  test('resets the project to the template after confirmation', async ({ page }) => {
    await openStrategy(page)
    await breakStandardShipping(page)

    await page.getByRole('button', { name: 'Réinitialiser' }).click()
    const dialog = page.getByRole('alertdialog', { name: 'Réinitialiser le projet ?' })
    await expect(dialog.getByRole('listitem')).toHaveText(['src/checkout/options/standard.ts'])
    await dialog.getByRole('button', { name: 'Réinitialiser' }).click()

    await expect(dialog).toBeHidden()
    await expect(status(page)).toBeEmpty()
    await expect(editor(page)).toContainText('money(490)')
    const results = await runTests(page)
    await expect(results.getByText(/^[1-9]\d* réussis$/)).toBeVisible({ timeout: 30_000 })
    await expect(results.getByText('0 échec')).toBeVisible()

    await page.reload()
    await page.getByRole('treeitem', { name: 'standard.ts' }).click()
    await expect(editor(page)).toContainText('money(490)')
  })

  test('keeps the edits when the reset is cancelled', async ({ page }) => {
    await openStrategy(page)
    await breakStandardShipping(page)

    await page.getByRole('button', { name: 'Réinitialiser' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Annuler' }).click()

    await expect(status(page)).toHaveText('Modifié')
    await expect(editor(page)).toContainText('money(500)')
  })
})
