import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test, type BrowserContext, type Page } from '@playwright/test'

import { editor, LANGUAGE_SERVICE_TIMEOUT, openStrategy } from '../../e2e/fixtures/strategy-ts.fixture.ts'

const STRATEGY_DIR = join(import.meta.dirname, '..', '..', '..', '..', '..', 'templates', 'strategy', 'ts')

const isLanguageServiceWorker = (url: URL) =>
  url.pathname.endsWith('/language-service.worker.ts') && url.searchParams.has('worker_file')

const holdLanguageServiceWorker = async (context: BrowserContext) => {
  const { promise: released, resolve: release } = Promise.withResolvers<void>()
  await context.route(isLanguageServiceWorker, async (route) => {
    await released
    await route.continue()
  })
  return release
}

const languageServiceStatus = (page: Page) => page.getByRole('status', { name: 'TypeScript' })

const typeAtEnd = async (page: Page, text: string) => {
  await editor(page).click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.type(text)
}

const firstError = (page: Page) => page.locator('.cm-lintRange-error').first()

test.describe('TypeScript in the editor', () => {
  test('flags a type error in the open file', async ({ page }) => {
    await openStrategy(page)

    await typeAtEnd(page, "\nconst total: number = 'free'")
    await expect(firstError(page)).toBeVisible()
    await firstError(page).hover()

    await expect(page.getByText("Type 'string' is not assignable to type 'number'.")).toBeVisible()
  })

  test('flags an import broken by an edit in another file', async ({ page }) => {
    const source = await readFile(join(STRATEGY_DIR, 'src', 'checkout', 'options', 'standard.ts'), 'utf8')
    await openStrategy(page)
    await page.getByRole('treeitem', { name: 'standard.ts' }).click()
    await editor(page).click()
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.insertText(source.replace('class StandardShipping', 'class StandardRate'))

    await page.getByRole('treeitem', { name: 'checkout.ts' }).click()
    await expect(firstError(page)).toBeVisible()
    await firstError(page).hover()

    await expect(page.getByText(/has no exported member (named )?'StandardShipping'/)).toBeVisible()
  })

  test('completes an export of another file and imports it', async ({ page }) => {
    await openStrategy(page)

    await typeAtEnd(page, '\naddMon')
    await page.getByRole('option', { name: /addMoney/ }).click()

    await expect(editor(page)).toContainText("import { addMoney, formatMoney, money } from './shop/money.ts'")
  })

  test('analyses a file created in the tree and imports its exports', async ({ page }) => {
    await openStrategy(page)
    await page
      .getByRole('tree', { name: 'Fichiers' })
      .getByRole('treeitem', { name: 'shop' })
      .click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Nouveau fichier' }).click()
    const name = page.getByRole('textbox', { name: 'Nom du nouveau fichier' })
    await name.fill('product-type.const.ts')
    await name.press('Enter')
    await editor(page).click()
    await page.keyboard.insertText("export const PRODUCT_TYPE = 'book'\n")

    await page.getByRole('treeitem', { name: 'main.ts' }).click()
    await typeAtEnd(page, '\nconsole.log(PRODUCT_T')
    await page.getByRole('option', { name: /PRODUCT_TYPE/ }).click()

    await expect(editor(page)).toContainText("import { PRODUCT_TYPE } from './shop/product-type.const.ts'")
    await expect(page.locator('.cm-lintRange-error')).toHaveCount(0)
  })

  test('marks a type error in the gutter', async ({ page }) => {
    await openStrategy(page)

    await typeAtEnd(page, "\nconst total: number = 'free'")

    await expect(page.locator('.cm-gutter-lint .cm-lint-marker-error')).toBeVisible()
  })

  test('shows the signature of the selected completion', async ({ page }) => {
    await openStrategy(page)

    await typeAtEnd(page, '\naddMon')

    await expect(page.locator('.cm-completionInfo')).toContainText('const addMoney: (a: Money, b: Money) => Money')
  })

  test('completes the path of a relative import', async ({ page }) => {
    await openStrategy(page)

    await typeAtEnd(page, "\nimport { ZERO } from './sh")

    await page.getByRole('option', { name: /^shop/ }).click()
    await expect(editor(page)).toContainText("import { ZERO } from './shop'")
  })

  test('closes the brackets and the quotes it opens', async ({ page }) => {
    await openStrategy(page)

    await typeAtEnd(page, "\nconst names = ['")

    await expect(editor(page)).toContainText("const names = ['']")
  })

  test('lists the problems of the project, open or not, and opens one', async ({ page }) => {
    const source = await readFile(join(STRATEGY_DIR, 'src', 'checkout', 'options', 'standard.ts'), 'utf8')
    await openStrategy(page)
    const problems = page.getByRole('tab', { name: /Problèmes/ })
    await expect(problems).toHaveText('Problèmes0')

    await page.getByRole('treeitem', { name: 'standard.ts' }).click()
    await editor(page).click()
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.insertText(source.replace('class StandardShipping', 'class StandardRate'))
    await problems.click()

    const problem = page.getByRole('button', { name: /^Erreur, src\/checkout\/checkout\.ts, ligne \d+/ }).first()
    await expect(problem).toBeVisible()
    await expect(problems).not.toHaveText('Problèmes0')
    await problem.click()
    await expect(page.getByRole('tab', { name: 'checkout.ts', exact: true })).toHaveAttribute('aria-selected', 'true')
  })

  test('tells that TypeScript is starting until it is ready', async ({ page, context }) => {
    const release = await holdLanguageServiceWorker(context)
    await page.goto('/play/strategy-ts')

    await expect(languageServiceStatus(page)).toHaveText('TypeScript démarre…')
    release()

    await expect(languageServiceStatus(page)).toHaveText('', { timeout: LANGUAGE_SERVICE_TIMEOUT })
  })

  test('offers to reload when a redeploy removed the TypeScript worker', async ({ page, context }) => {
    await context.route(isLanguageServiceWorker, (route) => route.fulfill({ status: 404 }))
    await page.goto('/play/strategy-ts')

    await expect(languageServiceStatus(page)).toHaveText('Nouvelle version de Typika', {
      timeout: LANGUAGE_SERVICE_TIMEOUT,
    })
    await context.unroute(isLanguageServiceWorker)
    await page.getByRole('button', { name: 'Recharger' }).click()

    await expect(languageServiceStatus(page)).toHaveText('', { timeout: LANGUAGE_SERVICE_TIMEOUT })
  })

  test('opens the completion typed before TypeScript was ready', async ({ page, context }) => {
    const release = await holdLanguageServiceWorker(context)
    await page.goto('/play/strategy-ts')

    await typeAtEnd(page, '\naddMon')
    await expect(languageServiceStatus(page)).toHaveText('TypeScript démarre…')
    release()

    await expect(page.getByRole('option', { name: /addMoney/ })).toBeVisible({ timeout: LANGUAGE_SERVICE_TIMEOUT })
  })

  test('shows the type of a symbol on hover', async ({ page }) => {
    await openStrategy(page)

    await editor(page).getByText('subtotalOf', { exact: true }).last().hover()

    await expect(page.getByText(/subtotalOf\(order: Order\): Money/)).toBeVisible()
  })

  test('shows the parameters of the function being called', async ({ page }) => {
    await openStrategy(page)

    await typeAtEnd(page, '\nquoteShipping(')

    await expect(page.getByRole('tooltip').getByText(/order: Order/)).toBeVisible()
  })
})
