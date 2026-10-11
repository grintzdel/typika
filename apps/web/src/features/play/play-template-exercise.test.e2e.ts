import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

const STRATEGY_DIR = join(import.meta.dirname, '..', '..', '..', '..', '..', 'templates', 'strategy', 'ts')
const TESTS_TIMEOUT = 30_000

const sidePanel = (page: Page) => page.getByRole('complementary', { name: 'Panneau latéral' })
const exercisePanel = (page: Page) => page.getByRole('region', { name: 'Exercice' })
const editor = (page: Page) => page.getByRole('textbox', { name: 'Éditeur' })
const results = (page: Page) => page.getByRole('region', { name: 'Résultats des tests' })

const openExercise = async (page: Page, name: string) => {
  await page.goto(`/play/strategy-ts?exercise=${name}`)
  await expect(page.getByRole('tree', { name: 'Fichiers' })).toBeVisible()
}

const runTests = async (page: Page) => {
  await page.getByRole('button', { name: 'Tests', exact: true }).click()
  await expect(results(page).getByText(/^[1-9]\d* réussis?$/)).toBeVisible({ timeout: TESTS_TIMEOUT })
}

const replaceFile = async (page: Page, name: string, content: string) => {
  await page.getByRole('treeitem', { name }).click()
  await editor(page).click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.insertText(content)
}

test.describe('exercises', () => {
  test('lists the exercises of the template', async ({ page }) => {
    await page.goto('/play/strategy-ts')
    await sidePanel(page).getByRole('tab', { name: 'Exercices' }).click()

    const list = sidePanel(page).getByRole('list', { name: 'Exercices' })
    await expect(list.getByRole('link', { name: /Add a pickup-point shipping option/ })).toHaveAttribute(
      'href',
      '/play/strategy-ts?exercise=add-pickup-point-option'
    )
    await expect(list.getByRole('link', { name: /Implement the express shipping strategy/ })).toHaveAttribute(
      'href',
      '/play/strategy-ts?exercise=implement-express'
    )
  })

  test('solves the fix exercise and remembers it', async ({ page }) => {
    const solution = await readFile(
      join(STRATEGY_DIR, 'exercises', 'implement-express', 'solution', 'src', 'checkout', 'options', 'express.ts'),
      'utf8'
    )
    await openExercise(page, 'implement-express')

    await expect(sidePanel(page).getByRole('tab', { name: 'Exercice' })).toHaveAttribute('aria-selected', 'true')
    await expect(
      exercisePanel(page).getByRole('heading', { name: 'Implement the express shipping strategy' })
    ).toBeVisible()
    await expect(exercisePanel(page).getByText('fix', { exact: true })).toBeVisible()
    await expect(exercisePanel(page).getByRole('list', { name: 'Tests cibles' })).toHaveText(
      'tests/express-shipping.test.ts'
    )

    await runTests(page)
    await expect(exercisePanel(page).getByText('0 / 5 tests cibles verts')).toBeVisible()

    await replaceFile(page, 'express.ts', solution)
    await runTests(page)

    await expect(exercisePanel(page).getByText('5 / 5 tests cibles verts')).toBeVisible()
    await expect(exercisePanel(page).getByText('Exercice réussi !')).toBeVisible()
    await expect(exercisePanel(page).getByRole('link', { name: 'Exercice suivant' })).toHaveAttribute(
      'href',
      '/play/strategy-ts?exercise=add-pickup-point-option'
    )

    await page.reload()
    await expect(exercisePanel(page).getByText('Exercice réussi !')).toBeVisible()
  })

  test('keeps the exercise apart from the template project', async ({ page }) => {
    await openExercise(page, 'implement-express')
    await page.getByRole('treeitem', { name: 'express.ts' }).click()
    await expect(editor(page)).toContainText('Express shipping is not implemented yet')

    await replaceFile(page, 'express.ts', '// rewritten in the exercise\n')
    await expect(page.getByRole('status', { name: 'État du projet' })).toContainText('Modifié')
    await page.goto('/play/strategy-ts')
    await page.getByRole('treeitem', { name: 'express.ts' }).click()

    await expect(editor(page)).toContainText('export class ExpressShipping implements ShippingCost')
    await expect(editor(page)).not.toContainText('rewritten in the exercise')
  })

  test('reveals the hints one by one', async ({ page }) => {
    await openExercise(page, 'implement-express')

    await exercisePanel(page).getByRole('button', { name: 'Afficher un indice (1 / 2)' }).click()
    await expect(exercisePanel(page).getByText(/You only need to change one file/)).toBeVisible()
    await expect(exercisePanel(page).getByText(/has the same shape as the strategy you need/)).toHaveCount(0)

    await exercisePanel(page).getByRole('button', { name: 'Afficher un indice (2 / 2)' }).click()
    await expect(exercisePanel(page).getByText(/has the same shape as the strategy you need/)).toBeVisible()
    await expect(exercisePanel(page).getByRole('button', { name: /Afficher un indice/ })).toHaveCount(0)
  })

  test('starts the refactor exercise from the base, shows the solution, then applies it', async ({ page }) => {
    await openExercise(page, 'add-pickup-point-option')

    await expect(page.getByRole('treeitem', { name: 'pickup-point.test.ts' })).toBeVisible()
    await expect(page.getByRole('treeitem', { name: 'shipping-cost.ts' })).toHaveCount(0)
    await expect(exercisePanel(page).getByText('refactor', { exact: true })).toBeVisible()

    await exercisePanel(page).getByRole('button', { name: 'Voir la solution' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Voir la solution' }).click()

    const diffPanel = sidePanel(page).getByRole('tabpanel', { name: 'Diff' })
    await expect(diffPanel.getByRole('button', { name: 'Solution' })).toHaveAttribute('aria-pressed', 'true')
    await expect(diffPanel.getByRole('button', { name: 'src/checkout/options/pickup-point.ts, ajouté' })).toBeVisible()
    await expect(page.getByRole('treeitem', { name: 'shipping-cost.ts' })).toHaveCount(0)

    await sidePanel(page).getByRole('tab', { name: 'Exercice' }).click()
    await exercisePanel(page).getByRole('button', { name: 'Appliquer la solution' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Appliquer la solution' }).click()

    await expect(page.getByRole('treeitem', { name: 'pickup-point.ts' })).toBeVisible()
    await runTests(page)
    await expect(results(page).getByText('0 échec')).toBeVisible()
    await expect(exercisePanel(page).getByText('Exercice réussi !')).toBeVisible()
  })
})
