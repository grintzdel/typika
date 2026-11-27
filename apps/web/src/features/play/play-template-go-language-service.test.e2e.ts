import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

const STRATEGY_DIR = join(import.meta.dirname, '..', '..', '..', '..', '..', 'templates', 'strategy', 'go')
const GOPLS_TIMEOUT = 120_000

const editor = (page: Page) => page.getByRole('textbox', { name: 'Éditeur' })
const tab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true })
const status = (page: Page) => page.getByRole('status', { name: 'gopls' })

const mainSource = () => readFile(join(STRATEGY_DIR, 'cmd', 'shop', 'main.go'), 'utf8')

const openStrategyGo = async (page: Page) => {
  await page.goto('/play/strategy-go')
  await expect(page.getByRole('tree', { name: 'Fichiers' })).toBeVisible({ timeout: GOPLS_TIMEOUT })
  await page.getByRole('treeitem', { name: 'main.go' }).click()
  const symbol = editor(page).getByText('QuoteShipping', { exact: true }).first()
  await expect(async () => {
    await page.mouse.move(0, 0)
    await symbol.hover()
    await expect(page.getByRole('tooltip')).toBeVisible({ timeout: 1_000 })
  }).toPass({ timeout: GOPLS_TIMEOUT })
  await page.mouse.move(0, 0)
}

const replaceMain = async (page: Page, content: string) => {
  await editor(page).click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.insertText(content)
}

const clickWordWithModifier = async (page: Page, lineText: string, word: string) => {
  const point = await editor(page)
    .locator('.cm-line', { hasText: lineText })
    .first()
    .evaluate((line, searched) => {
      const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const index = node.textContent?.lastIndexOf(searched) ?? -1
        if (index === -1) continue
        const range = document.createRange()
        range.setStart(node, index)
        range.setEnd(node, index + searched.length)
        const rect = range.getBoundingClientRect()
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
      }
      return null
    }, word)
  if (point === null) throw new Error(`"${word}" is not on the line "${lineText}"`)
  await page.keyboard.down('ControlOrMeta')
  await page.mouse.click(point.x, point.y)
  await page.keyboard.up('ControlOrMeta')
}

test.describe('gopls in the editor', () => {
  test('names gopls in the status and goes quiet once it is ready', async ({ page }) => {
    await openStrategyGo(page)

    await expect(status(page)).toHaveText('')
  })

  test('opens the definition of checkout.Standard clicked with Cmd or Ctrl', async ({ page }) => {
    const source = await mainSource()
    await openStrategyGo(page)

    await replaceMain(page, source.replace('func main() {', 'func main() {\n\t_ = checkout.Standard'))
    await clickWordWithModifier(page, '_ = checkout.Standard', 'Standard')

    await expect(tab(page, 'shipping_option.go')).toHaveAttribute('aria-selected', 'true', { timeout: GOPLS_TIMEOUT })
    await expect(page.locator('.cm-activeLine')).toContainText('Standard ShippingOption = "standard"')
  })

  test('lists the exported names of a package after its name', async ({ page }) => {
    await openStrategyGo(page)

    await editor(page).locator('.cm-line', { hasText: 'for _, order := range orders {' }).click()
    await page.keyboard.press('End')
    await page.keyboard.type('\ncheckout.')

    await expect(page.getByRole('option', { name: /^QuoteShipping/ })).toBeVisible({ timeout: GOPLS_TIMEOUT })
    await expect(page.getByRole('option', { name: /^ShippingOptions/ })).toBeVisible()
    await expect(page.getByRole('option', { name: /^Standard/ }).first()).toBeVisible()
    await expect(page.getByRole('option', { name: /^EUR/ })).toHaveCount(0)
  })

  test('shows a type error before any run', async ({ page }) => {
    const source = await mainSource()
    await openStrategyGo(page)

    await replaceMain(page, source.replace('func main() {', 'func main() {\n\tvar total int = "free"\n\t_ = total'))

    const error = editor(page).locator('.cm-lintRange-error').first()
    await expect(error).toBeVisible({ timeout: GOPLS_TIMEOUT })
    await error.hover()
    await expect(page.getByText(/cannot use "free" \(untyped string constant\) as int value/).first()).toBeVisible()
  })

  test('checks a file typed into a new folder once gopls loads its package', async ({ page }) => {
    await openStrategyGo(page)

    await page.getByRole('treeitem', { name: 'cmd' }).click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Nouveau dossier' }).click()
    await page.getByRole('textbox', { name: 'Nom du nouveau dossier' }).fill('product')
    await page.getByRole('textbox', { name: 'Nom du nouveau dossier' }).press('Enter')
    await page.getByRole('treeitem', { name: /^product/ }).click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Nouveau fichier' }).click()
    await page.getByRole('textbox', { name: 'Nom du nouveau fichier' }).fill('main.go')
    await page.getByRole('textbox', { name: 'Nom du nouveau fichier' }).press('Enter')
    await editor(page).click()
    await page.keyboard.type('package product')
    await page.keyboard.press('Escape')
    await page.keyboard.insertText('\n\nvar total int = "free"\n')

    const error = editor(page).locator('.cm-lintRange-error')
    await expect(error).toHaveText('"free"', { timeout: GOPLS_TIMEOUT })
    await expect(error).toHaveCount(1)
    await error.hover()
    await expect(page.getByText(/cannot use "free" \(untyped string constant\) as int value/).first()).toBeVisible()
  })
})
