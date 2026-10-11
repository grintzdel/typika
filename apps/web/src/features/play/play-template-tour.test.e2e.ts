import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

const STRATEGY_DIR = join(import.meta.dirname, '..', '..', '..', '..', '..', 'templates', 'strategy', 'ts')

const TITLES = [
  'Two ways to ship, two ways to price',
  'One method, every rule',
  'One interface, many prices',
  'The context delegates',
  'Choosing a strategy',
  'When not to use it',
]

const titleOf = (index: number): string => TITLES[index] ?? ''

const editor = (page: Page) => page.getByRole('textbox', { name: 'Éditeur' })
const tour = (page: Page) => page.getByRole('complementary', { name: 'Visite guidée' })
const openTabs = (page: Page) => page.getByRole('tablist', { name: 'Fichiers ouverts' })
const highlightedLines = (page: Page) => editor(page).locator('.cm-typika-tour-line')

const open = async (page: Page, hash = '') => {
  await page.goto(`/play/strategy-ts${hash}`)
  await expect(page.getByRole('tree', { name: 'Fichiers' })).toBeVisible()
}

const expectStep = async (page: Page, index: number) => {
  await expect(tour(page).getByText(`Étape ${index + 1} / ${TITLES.length}`)).toBeVisible()
  await expect(tour(page).getByRole('heading', { name: titleOf(index) })).toBeVisible()
}

const pressNext = async (page: Page, index: number) => {
  await page.keyboard.press('Alt+ArrowRight')
  await expectStep(page, index)
  await expect(page.getByText(`Étape ${index + 1} sur ${TITLES.length} : ${titleOf(index)}`)).toBeAttached()
}

test.describe('guided tour', () => {
  test('walks the whole tour with the keyboard', async ({ page }) => {
    await open(page)
    await expectStep(page, 0)
    await tour(page)
      .getByRole('heading', { name: titleOf(0) })
      .click()

    await pressNext(page, 1)
    await pressNext(page, 2)
    await pressNext(page, 3)
    await pressNext(page, 4)
    await pressNext(page, 5)
    await expect(tour(page).getByRole('button', { name: 'Étape suivante' })).toBeDisabled()

    await page.keyboard.press('Alt+ArrowLeft')
    await expectStep(page, 4)
  })

  test('opens the anchored file and highlights its region without the markers', async ({ page }) => {
    await open(page)

    await tour(page)
      .getByRole('list', { name: 'Étapes' })
      .getByRole('button', { name: titleOf(3) })
      .click()

    await expectStep(page, 3)
    await expect(openTabs(page).getByRole('tab', { name: 'shipping-quote.ts' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    await expect(openTabs(page).getByRole('tab', { name: 'shipping-quote.test.ts' })).toHaveAttribute(
      'aria-selected',
      'false'
    )
    await expect(highlightedLines(page).first()).toHaveText('export class ShippingQuote {')
    await expect(highlightedLines(page).last()).toHaveText('}')
    await expect(highlightedLines(page).filter({ hasText: '#region' })).toHaveCount(0)
    await expect(highlightedLines(page).filter({ hasText: '#endregion' })).toHaveCount(0)
  })

  test('keeps the current step in the URL and restores it on reload', async ({ page }) => {
    await open(page)

    await tour(page).getByRole('button', { name: 'Étape suivante' }).click()
    await expect(page).toHaveURL(/#step=the-problem$/)

    await open(page, '#step=choosing-at-runtime')
    await page.reload()

    await expectStep(page, 4)
    await expect(openTabs(page).getByRole('tab', { name: 'checkout.ts' })).toHaveAttribute('aria-selected', 'true')
    await expect(highlightedLines(page).first()).toHaveText(
      'const shippingCosts: Record<ShippingOption, ShippingCost> = {'
    )
  })

  test('tells when the code has changed and opens the original read-only', async ({ page }) => {
    const source = await readFile(join(STRATEGY_DIR, 'src', 'checkout', 'shipping-quote.ts'), 'utf8')
    await open(page, '#step=context')
    await expect(highlightedLines(page).first()).toBeVisible()

    await editor(page).click()
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.insertText(source.replace('// #region tour:context\n', '').replace('// #endregion\n', ''))
    await tour(page)
      .getByRole('list', { name: 'Étapes' })
      .getByRole('button', { name: titleOf(3) })
      .click()

    await expect(tour(page).getByText('Le code a changé depuis cette visite.')).toBeVisible()
    await expect(highlightedLines(page)).toHaveCount(0)

    await tour(page).getByRole('button', { name: 'Voir la version d’origine' }).click()

    await expect(openTabs(page).getByRole('tab', { name: 'shipping-quote.ts (origine)' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    await expect(editor(page)).toHaveAttribute('aria-readonly', 'true')
    await expect(highlightedLines(page).first()).toHaveText('export class ShippingQuote {')
  })

  test('groups the Typika files read-only in the tree', async ({ page }) => {
    await open(page)

    const group = page.getByRole('treeitem', { name: 'Typika' })
    await expect(group.getByRole('treeitem', { name: 'typika.toml, lecture seule' })).toBeVisible()
    await expect(group.getByRole('treeitem', { name: 'tour' })).toBeVisible()

    await group.getByRole('treeitem', { name: 'typika.toml, lecture seule' }).click()

    await expect(editor(page)).toContainText('name = "strategy-ts"')
    await expect(editor(page)).toHaveAttribute('aria-readonly', 'true')
  })
})
