import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

const STRATEGY_DIR = join(import.meta.dirname, '..', '..', '..', '..', '..', 'templates', 'strategy', 'go')
const GO_ASSETS = /\/runtime\/assets\/go\//
const TIMEOUT = 60_000

const editor = (page: Page) => page.getByRole('textbox', { name: 'Éditeur' })
const consoleRegion = (page: Page) => page.getByRole('region', { name: 'Console' })
const results = (page: Page) => page.getByRole('region', { name: 'Résultats des tests' })
const exercisePanel = (page: Page) => page.getByRole('region', { name: 'Exercice' })

const waitForRuntime = async (page: Page) => {
  await expect(page.getByRole('tree', { name: 'Fichiers' })).toBeVisible({ timeout: TIMEOUT })
  await expect(page.getByRole('button', { name: 'Tests', exact: true })).toBeEnabled({ timeout: TIMEOUT })
}

const open = async (page: Page, path = '/play/strategy-go') => {
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

const mainSource = () => readFile(join(STRATEGY_DIR, 'cmd', 'shop', 'main.go'), 'utf8')

test.describe('Go sandbox', () => {
  test('runs the entry of strategy-go', async ({ page }) => {
    await open(page)

    await page.getByRole('button', { name: 'Exécuter' }).click()

    await expect(consoleRegion(page).getByText(/Ada \(regular\)/)).toBeVisible({ timeout: TIMEOUT })
    await expect(consoleRegion(page).getByText('Terminé avec le code 0')).toBeVisible()
  })

  test('runs the tests of strategy-go green', async ({ page }) => {
    await open(page)

    await runTests(page)

    await expect(results(page).getByText('12 réussis')).toBeVisible()
    await expect(results(page).getByText('0 échec')).toBeVisible()
  })

  test('does not download the Go toolchain again after a reload', async ({ playwright, browserName, baseURL }) => {
    // WebKit empties the Cache Storage of an ephemeral context on reload, so the cache is checked in a real profile.
    const profile = await mkdtemp(join(tmpdir(), 'typika-go-cache-'))
    const context = await playwright[browserName].launchPersistentContext(profile, {
      ...(baseURL === undefined ? {} : { baseURL }),
      locale: 'fr-FR',
    })
    try {
      const page = await context.newPage()
      await open(page)
      const downloads: Array<string> = []
      page.on('request', (request) => {
        if (GO_ASSETS.test(request.url())) downloads.push(request.url())
      })

      await page.reload()
      await waitForRuntime(page)
      await runTests(page)

      expect(downloads).toEqual([])
    } finally {
      await context.close()
      await rm(profile, { recursive: true, force: true })
    }
  })

  test('shows a build error in the console and on the line in the editor', async ({ page }) => {
    const source = await mainSource()
    await open(page)

    await replaceFile(page, 'main.go', source.replace('func main() {', 'func main() {\n\tundefinedCall()'))
    await page.getByRole('button', { name: 'Exécuter' }).click()

    await expect(consoleRegion(page).getByText('Échec du build')).toBeVisible({ timeout: TIMEOUT })
    await expect(consoleRegion(page).getByText(/cmd\/shop\/main\.go:\d+:\d+ undefined: undefinedCall/)).toBeVisible()
    await expect(editor(page).locator('.cm-lintRange-error')).toHaveText('undefinedCall')
  })

  test('stops an endless program, then runs again', async ({ page }) => {
    const source = await mainSource()
    await open(page)

    await replaceFile(page, 'main.go', source.replace('func main() {', 'func main() {\n\tfor {\n\t}'))
    await page.getByRole('button', { name: 'Exécuter' }).click()
    await expect(consoleRegion(page).getByText('En cours…')).toBeVisible()
    await page.getByRole('button', { name: 'Arrêter' }).click()
    await expect(consoleRegion(page).getByText('Interrompu', { exact: true })).toBeVisible()

    await replaceFile(page, 'main.go', source)
    await page.getByRole('button', { name: 'Exécuter' }).click()
    await expect(consoleRegion(page).getByText('Terminé avec le code 0')).toBeVisible({ timeout: TIMEOUT })
  })

  test('solves the fix exercise', async ({ page }) => {
    const solution = await readFile(
      join(STRATEGY_DIR, 'exercises', 'implement-express', 'solution', 'internal', 'checkout', 'express.go'),
      'utf8'
    )
    await open(page, '/play/strategy-go?exercise=implement-express')

    await runTests(page)
    await expect(exercisePanel(page).getByText(/^[0-4] \/ 5 tests cibles verts$/)).toBeVisible()

    await replaceFile(page, 'express.go', solution)
    await runTests(page)

    await expect(exercisePanel(page).getByText('Exercice réussi !')).toBeVisible()
  })

  test('solves the refactor exercise with its solution', async ({ page }) => {
    await open(page, '/play/strategy-go?exercise=add-pickup-point-option')

    await runTests(page)
    await expect(exercisePanel(page).getByText(/^[0-6] \/ 7 tests cibles verts$/)).toBeVisible()

    await exercisePanel(page).getByRole('button', { name: 'Appliquer la solution' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Appliquer la solution' }).click()
    await runTests(page)

    await expect(exercisePanel(page).getByText('Exercice réussi !')).toBeVisible()
  })
})
