import { expect, test, type Page } from '@playwright/test'

import { editor, openStrategy } from '../../e2e/fixtures/strategy-ts.fixture.ts'

const IS_MAC = process.platform === 'darwin'
const NEXT_TAB = IS_MAC ? 'Control+Alt+ArrowRight' : 'Alt+ArrowRight'
const PREVIOUS_TAB = IS_MAC ? 'Control+Alt+ArrowLeft' : 'Alt+ArrowLeft'

const tab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true })
const activeLine = (page: Page) => page.locator('.cm-activeLine')
const references = (page: Page) => page.getByRole('region', { name: 'Références' })

const clickWordWithModifier = async (page: Page, lineText: string, word: string) => {
  const point = await editor(page)
    .locator('.cm-line', { hasText: lineText })
    .first()
    .evaluate((line, searched) => {
      const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const index = node.textContent?.indexOf(searched) ?? -1
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

const openFile = async (page: Page, name: string) => {
  await page.getByRole('treeitem', { name }).click()
  await expect(tab(page, name)).toHaveAttribute('aria-selected', 'true')
}

test.describe('code navigation', () => {
  test('opens the declaration of a symbol clicked with Cmd or Ctrl', async ({ page }) => {
    await openStrategy(page)

    await editor(page)
      .getByText('quoteShipping', { exact: true })
      .last()
      .click({ modifiers: ['ControlOrMeta'] })

    await expect(tab(page, 'checkout.ts')).toHaveAttribute('aria-selected', 'true')
    await expect(activeLine(page)).toContainText('export const quoteShipping')
  })

  test('lists the references of a declaration clicked with Cmd or Ctrl, and opens one', async ({ page }) => {
    await openStrategy(page)
    await openFile(page, 'checkout.ts')

    await clickWordWithModifier(page, 'export const quoteShipping', 'quoteShipping')

    await expect(page.getByRole('tab', { name: /Références/ })).toHaveAttribute('aria-selected', 'true')
    await expect(references(page).getByRole('heading', { name: /références à quoteShipping/ })).toBeVisible()
    await references(page)
      .getByRole('button', { name: /tests\/quote\.test\.ts, ligne 16/ })
      .click()

    await expect(tab(page, 'quote.test.ts')).toHaveAttribute('aria-selected', 'true')
    await expect(activeLine(page)).toContainText("expect(quoteShipping(order, 'standard').subtotal)")
  })

  test('lists the references of the symbol under the cursor with Shift+F12', async ({ page }) => {
    await openStrategy(page)
    await editor(page).getByText('formatMoney', { exact: true }).first().click()

    await page.keyboard.press('Shift+F12')

    await expect(references(page).getByRole('heading', { name: /références à formatMoney/ })).toBeVisible()
    await expect(references(page).getByRole('button', { name: /src\/shop\/money\.ts, ligne 19/ })).toBeVisible()
  })

  test('renames a symbol in every file with F2', async ({ page }) => {
    await openStrategy(page)
    await editor(page).getByText('formatMoney', { exact: true }).first().click()

    await page.keyboard.press('F2')
    await page.getByRole('textbox', { name: 'Nouveau nom' }).fill('formatAmount')
    await page.keyboard.press('Enter')

    await expect(editor(page)).toContainText("import { formatAmount, money } from './shop/money.ts'")
    await expect(editor(page)).not.toContainText('formatMoney')
    await openFile(page, 'money.ts')
    await expect(editor(page)).toContainText('export const formatAmount')
  })
})

test.describe('editor shortcuts', () => {
  test('closes the active file with Alt+W, and a tab with a middle click', async ({ page }) => {
    await openStrategy(page)
    await openFile(page, 'money.ts')
    await openFile(page, 'order.ts')

    await editor(page).click()
    await page.keyboard.press('Alt+KeyW')
    await expect(tab(page, 'order.ts')).toHaveCount(0)

    await tab(page, 'main.ts').click({ button: 'middle' })
    await expect(tab(page, 'main.ts')).toHaveCount(0)
    await expect(tab(page, 'money.ts')).toHaveAttribute('aria-selected', 'true')
  })

  test('moves to the next and the previous tab from the keyboard', async ({ page }) => {
    await openStrategy(page)
    await openFile(page, 'money.ts')
    await editor(page).click()

    await page.keyboard.press(NEXT_TAB)
    await expect(tab(page, 'main.ts')).toHaveAttribute('aria-selected', 'true')

    await page.keyboard.press(PREVIOUS_TAB)
    await expect(tab(page, 'money.ts')).toHaveAttribute('aria-selected', 'true')
  })

  test('opens a file by its name with Cmd or Ctrl+P', async ({ page }) => {
    await openStrategy(page)

    await page.keyboard.press('ControlOrMeta+KeyP')
    await page.getByRole('combobox', { name: 'Ouvrir un fichier' }).fill('standard')
    await page.keyboard.press('Enter')

    await expect(tab(page, 'standard.ts')).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('finds and replaces in the open file with Cmd or Ctrl+F', async ({ page }) => {
    await openStrategy(page)
    await editor(page).click()

    await page.keyboard.press('ControlOrMeta+KeyF')
    await page.getByRole('textbox', { name: 'Rechercher' }).fill('orders')
    await page.getByRole('textbox', { name: 'Remplacer' }).fill('commandes')
    await page.getByRole('button', { name: 'Tout remplacer' }).click()

    await expect(editor(page)).toContainText('for (const order of commandes)')
    await expect(editor(page)).not.toContainText('orders')
  })
})
