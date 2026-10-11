import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test, type BrowserContext, type Page } from '@playwright/test'

const STRATEGY_DIR = join(import.meta.dirname, '..', '..', '..', '..', '..', 'templates', 'strategy', 'ts')
const LANGUAGE_SERVICE_TIMEOUT = 15_000

const editor = (page: Page) => page.getByRole('textbox', { name: 'Éditeur' })

const openStrategy = async (page: Page) => {
  await page.goto('/play/strategy-ts')
  await expect(page.getByRole('tree', { name: 'Fichiers' })).toBeVisible()
  const symbol = editor(page).getByText('quoteShipping', { exact: true }).first()
  await expect(async () => {
    await page.mouse.move(0, 0)
    await symbol.hover()
    await expect(page.getByRole('tooltip')).toBeVisible({ timeout: 1_000 })
  }).toPass({ timeout: LANGUAGE_SERVICE_TIMEOUT })
  await page.mouse.move(0, 0)
  await expect(page.getByRole('tooltip')).toBeHidden()
}

const holdLanguageServiceWorker = async (context: BrowserContext) => {
  const { promise: released, resolve: release } = Promise.withResolvers<void>()
  await context.route(
    (url) => url.pathname.endsWith('/language-service.worker.ts'),
    async (route) => {
      await released
      await route.continue()
    }
  )
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

  test('tells that TypeScript is starting until it is ready', async ({ page, context }) => {
    const release = await holdLanguageServiceWorker(context)
    await page.goto('/play/strategy-ts')

    await expect(languageServiceStatus(page)).toHaveText('TypeScript démarre…')
    release()

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
