import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

const STRATEGY_DIR = join(import.meta.dirname, '..', '..', '..', '..', '..', 'templates', 'strategy', 'ts')

const sidePanel = (page: Page) => page.getByRole('complementary', { name: 'Panneau latéral' })
const diffPanel = (page: Page) => sidePanel(page).getByRole('tabpanel', { name: 'Diff' })
const changedFiles = (page: Page) => diffPanel(page).getByRole('list', { name: 'Fichiers modifiés' })
const openTabs = (page: Page) => page.getByRole('tablist', { name: 'Fichiers ouverts' })

const openDiff = async (page: Page) => {
  await page.goto('/play/strategy-ts')
  await expect(page.getByRole('tree', { name: 'Fichiers' })).toBeVisible()
  await sidePanel(page).getByRole('tab', { name: 'Diff' }).click()
}

const openBaseDiffOf = async (page: Page, path: string) => {
  await openDiff(page)
  await changedFiles(page)
    .getByRole('button', { name: `${path}, modifié` })
    .click()
}

test.describe('diff view', () => {
  test('lists the files of the focus that changed since the base', async ({ page }) => {
    await openDiff(page)

    await expect(diffPanel(page).getByRole('button', { name: 'Depuis la base' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await expect(changedFiles(page).getByRole('button')).toHaveText([
      /src\/checkout\/checkout\.ts/,
      /src\/checkout\/options\/express\.ts/,
      /src\/checkout\/options\/standard\.ts/,
      /src\/checkout\/shipping-cost\.ts/,
      /src\/checkout\/shipping-quote\.ts/,
    ])
    await expect(
      changedFiles(page).getByRole('button', { name: 'src/checkout/shipping-cost.ts, ajouté' })
    ).toBeVisible()
    await expect(changedFiles(page).getByRole('button', { name: 'src/checkout/checkout.ts, modifié' })).toBeVisible()
  })

  test('shows a file side by side, then unified, without the tour markers', async ({ page }) => {
    await openBaseDiffOf(page, 'src/checkout/shipping-quote.ts')

    await expect(openTabs(page).getByRole('tab', { name: 'shipping-quote.ts (depuis la base)' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    const base = page.getByRole('textbox', { name: 'Version de la base' })
    const template = page.getByRole('textbox', { name: 'Version du template' })
    await expect(base).toContainText("this.option === 'express'")
    await expect(template).toContainText('this.shippingCost.costFor(order)')
    await expect(template).not.toContainText('#region')
    await expect(page.locator('.cm-typika-diff-sign').filter({ hasText: '+' }).first()).toBeVisible()
    await expect(page.locator('.cm-typika-diff-sign').filter({ hasText: '-' }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Vue unifiée' }).click()

    await expect(page.getByRole('button', { name: 'Vue unifiée' })).toHaveAttribute('aria-pressed', 'true')
    await expect(base).toBeHidden()
    await expect(page.getByRole('textbox', { name: 'Diff' })).toContainText('this.shippingCost.costFor(order)')
    await expect(page.getByRole('textbox', { name: 'Diff' })).toContainText("this.option === 'express'")
  })

  test('leads from the diff to the tour steps anchored in the file', async ({ page }) => {
    await openBaseDiffOf(page, 'src/checkout/shipping-quote.ts')

    await page.getByRole('button', { name: 'Étape 4 : The context delegates' }).click()

    await expect(sidePanel(page).getByRole('tab', { name: 'Visite' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('region', { name: 'Visite guidée' }).getByRole('heading')).toHaveText(
      'The context delegates'
    )
    await expect(openTabs(page).getByRole('tab', { name: 'shipping-quote.ts', exact: true })).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })

  test('shows my changes since the template', async ({ page }) => {
    const source = await readFile(join(STRATEGY_DIR, 'src', 'checkout', 'options', 'standard.ts'), 'utf8')
    await page.goto('/play/strategy-ts')
    await page.getByRole('treeitem', { name: 'standard.ts' }).click()
    const editor = page.getByRole('textbox', { name: 'Éditeur' })
    await editor.click()
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.insertText(source.replace('money(490)', 'money(500)'))
    await sidePanel(page).getByRole('tab', { name: 'Diff' }).click()

    await diffPanel(page).getByRole('button', { name: 'Mes modifications' }).click()
    await changedFiles(page).getByRole('button', { name: 'src/checkout/options/standard.ts, modifié' }).click()

    await expect(openTabs(page).getByRole('tab', { name: 'standard.ts (mes modifications)' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    await expect(page.getByRole('textbox', { name: 'Version d’origine' })).toContainText('money(490)')
    await expect(page.getByRole('textbox', { name: 'Ma version' })).toContainText('money(500)')
  })

  test('keeps an edit after a diff tab and after closing every tab', async ({ page }) => {
    await page.goto('/play/strategy-ts')
    await page.getByRole('treeitem', { name: 'standard.ts' }).click()
    const editor = page.getByRole('textbox', { name: 'Éditeur' })
    await editor.click()
    await page.keyboard.press('ControlOrMeta+End')
    await page.keyboard.type('\n// kept')
    await sidePanel(page).getByRole('tab', { name: 'Diff' }).click()
    await changedFiles(page).getByRole('button', { name: 'src/checkout/shipping-quote.ts, modifié' }).click()

    await openTabs(page).getByRole('tab', { name: 'standard.ts', exact: true }).click()
    await expect(editor).toContainText('// kept')

    const firstTab = openTabs(page).getByRole('tab').first()
    await expect(openTabs(page).getByRole('tab')).toHaveCount(3)
    await firstTab.press('Delete')
    await firstTab.press('Delete')
    await firstTab.press('Delete')
    await expect(openTabs(page).getByRole('tab')).toHaveCount(0)
    await page.getByRole('treeitem', { name: 'standard.ts' }).click()
    await expect(editor).toContainText('// kept')
  })

  test('says when nothing has changed', async ({ page }) => {
    await openDiff(page)

    await diffPanel(page).getByRole('button', { name: 'Mes modifications' }).click()

    await expect(diffPanel(page).getByText('Aucune modification.')).toBeVisible()
  })

  test('opens the base in a separate sandbox', async ({ page }) => {
    await openDiff(page)

    const link = diffPanel(page).getByRole('link', { name: 'Ouvrir la base' })
    await expect(link).toHaveAttribute('href', '/play/strategy-base-ts')
    await expect(link).toHaveAttribute('target', '_blank')

    await page.goto('/play/strategy-base-ts')
    await expect(page.getByText('Strategy base: shipping options')).toBeVisible()
    await expect(sidePanel(page).getByRole('tab', { name: 'Visite' })).toHaveCount(0)
  })
})
