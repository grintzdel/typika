import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

const STRATEGY_DIR = join(import.meta.dirname, '..', '..', '..', '..', '..', 'templates', 'strategy', 'kotlin')
const COMPILE = /\/api\/kotlin\/compile$/
const TIMEOUT = 60_000

const editor = (page: Page) => page.getByRole('textbox', { name: 'Éditeur' })
const consoleRegion = (page: Page) => page.getByRole('region', { name: 'Console' })
const results = (page: Page) => page.getByRole('region', { name: 'Résultats des tests' })
const exercisePanel = (page: Page) => page.getByRole('region', { name: 'Exercice' })

const waitForRuntime = async (page: Page) => {
  await expect(page.getByRole('tree', { name: 'Fichiers' })).toBeVisible({ timeout: TIMEOUT })
  await expect(page.getByRole('button', { name: 'Tests', exact: true })).toBeEnabled({ timeout: TIMEOUT })
}

const open = async (page: Page, path = '/play/strategy-kotlin') => {
  await page.goto(path)
  await waitForRuntime(page)
}

const runTests = async (page: Page) => {
  await page.getByRole('button', { name: 'Tests', exact: true }).click()
  await expect(results(page).getByText(/^[1-9]\d* réussis?$/)).toBeVisible({ timeout: TIMEOUT })
}

const replaceFile = async (page: Page, name: string, content: string) => {
  await page.getByRole('treeitem', { name }).click()
  await editor(page).click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.insertText(content)
}

const source = (...path: ReadonlyArray<string>) => readFile(join(STRATEGY_DIR, ...path), 'utf8')

const modifyMain = async (page: Page) => {
  const main = await source('src', 'main', 'kotlin', 'Main.kt')
  await replaceFile(page, 'Main.kt', main.replace('fun main() {', 'fun main() {\n    println("modified")'))
  await expect(page.getByRole('status', { name: 'État du projet' })).toHaveText('Modifié')
}

test.describe('Kotlin sandbox', () => {
  test('runs main of strategy-kotlin', async ({ page }) => {
    await open(page)

    await page.getByRole('button', { name: 'Exécuter' }).click()

    await expect(consoleRegion(page).getByText(/Ada \(regular\)/)).toBeVisible({ timeout: TIMEOUT })
    await expect(consoleRegion(page).getByText('Terminé avec le code 0')).toBeVisible()
  })

  test('runs the tests of strategy-kotlin green', async ({ page }) => {
    await open(page)

    await runTests(page)

    await expect(results(page).getByText('11 réussis')).toBeVisible()
    await expect(results(page).getByText('0 échec')).toBeVisible()
  })

  test('runs strategy-kotlin from its precompiled artifacts, then compiles once it is modified', async ({ page }) => {
    const compilations: Array<string> = []
    page.on('request', (request) => {
      if (COMPILE.test(request.url())) compilations.push(request.url())
    })
    await open(page)

    await runTests(page)
    await page.getByRole('button', { name: 'Exécuter' }).click()
    await expect(consoleRegion(page).getByText('Terminé avec le code 0')).toBeVisible({ timeout: TIMEOUT })
    expect(compilations).toEqual([])

    await modifyMain(page)
    await Promise.all([page.waitForRequest(COMPILE), runTests(page)])

    expect(compilations).toHaveLength(1)
  })

  test('does not compile the same sources again after a reload', async ({ page }) => {
    await open(page)
    await modifyMain(page)
    await runTests(page)
    const compilations: Array<string> = []
    page.on('request', (request) => {
      if (COMPILE.test(request.url())) compilations.push(request.url())
    })

    await page.reload()
    await waitForRuntime(page)
    await runTests(page)

    expect(compilations).toEqual([])
  })

  test('shows a compile error in the console and on the line in the editor', async ({ page }) => {
    const main = await source('src', 'main', 'kotlin', 'Main.kt')
    await open(page)

    await replaceFile(page, 'Main.kt', main.replace('fun main() {', 'fun main() {\n    undefinedCall()'))
    await page.getByRole('button', { name: 'Exécuter' }).click()

    await expect(consoleRegion(page).getByText('Échec du build')).toBeVisible({ timeout: TIMEOUT })
    await expect(
      consoleRegion(page).getByText(/src\/main\/kotlin\/Main\.kt:\d+:\d+ Unresolved reference 'undefinedCall'/)
    ).toBeVisible()
    await expect(editor(page).locator('.cm-lintRange-error')).toHaveText('undefinedCall')
  })

  test('solves the fix exercise', async ({ page }) => {
    const solution = await source(
      'exercises',
      'implement-express',
      'solution',
      'src',
      'main',
      'kotlin',
      'checkout',
      'ExpressShipping.kt'
    )
    await open(page, '/play/strategy-kotlin?exercise=implement-express')

    await runTests(page)
    await expect(exercisePanel(page).getByText(/^[0-4] \/ 5 tests cibles verts$/)).toBeVisible()

    await replaceFile(page, 'ExpressShipping.kt', solution)
    await runTests(page)

    await expect(exercisePanel(page).getByText('Exercice réussi !')).toBeVisible()
  })

  test('solves the refactor exercise with its solution', async ({ page }) => {
    await open(page, '/play/strategy-kotlin?exercise=add-pickup-point-option')

    await page.getByRole('button', { name: 'Tests', exact: true }).click()
    await expect(exercisePanel(page).getByText(/^[0-5] \/ 6 tests cibles verts$/)).toBeVisible({ timeout: TIMEOUT })

    await exercisePanel(page).getByRole('button', { name: 'Appliquer la solution' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Appliquer la solution' }).click()
    await runTests(page)

    await expect(exercisePanel(page).getByText('Exercice réussi !')).toBeVisible()
  })
})
