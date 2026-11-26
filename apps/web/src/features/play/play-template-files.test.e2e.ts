import { expect, test, type Page } from '@playwright/test'

import { editor, LANGUAGE_SERVICE_TIMEOUT, openStrategy } from '../../e2e/fixtures/strategy-ts.fixture.ts'

const tree = (page: Page) => page.getByRole('tree', { name: 'Fichiers' })
const tab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true })
const status = (page: Page) => page.getByRole('status', { name: 'État du projet' })

test.describe('file tree editing', () => {
  test('creates a file in a folder, then renames it, in the tree and the tabs', async ({ page }) => {
    await openStrategy(page)

    await tree(page).getByRole('treeitem', { name: 'shop' }).click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Nouveau fichier' }).click()
    const name = page.getByRole('textbox', { name: 'Nom du nouveau fichier' })
    await expect(name).toBeFocused()
    await name.fill('order.ts')
    await name.press('Enter')
    await expect(page.getByText('Un fichier ou un dossier porte déjà ce nom.')).toBeVisible()
    await name.fill('tax.ts')
    await name.press('Enter')

    await expect(tree(page).getByRole('treeitem', { name: 'tax.ts, modifié' })).toBeVisible()
    await expect(tab(page, 'tax.ts')).toHaveAttribute('aria-selected', 'true')
    await expect(status(page)).toHaveText('Modifié')
    await editor(page).click()
    await page.keyboard.insertText("import { money } from './money.ts'\n\nexport const tax = money(20)\n")

    await tree(page).getByRole('treeitem', { name: 'tax.ts, modifié' }).focus()
    await page.keyboard.press('F2')
    const rename = page.getByRole('textbox', { name: 'Nouveau nom de tax.ts' })
    await expect(rename).toBeFocused()
    await rename.fill('vat.ts')
    await rename.press('Enter')

    await expect(tree(page).getByRole('treeitem', { name: 'vat.ts, modifié' })).toBeFocused()
    await expect(tree(page).getByRole('treeitem', { name: /^tax\.ts/ })).toHaveCount(0)
    await expect(tab(page, 'vat.ts')).toHaveAttribute('aria-selected', 'true')
    await expect(tab(page, 'tax.ts')).toHaveCount(0)
    await expect(editor(page)).toContainText('export const tax = money(20)')
    await expect(editor(page).locator('.cm-lintRange-error')).toHaveCount(0, { timeout: LANGUAGE_SERVICE_TIMEOUT })

    await page.reload()
    await expect(tree(page).getByRole('treeitem', { name: 'shop' })).toBeVisible()
    await expect(tree(page).getByRole('treeitem', { name: 'vat.ts, modifié' })).toBeVisible()
    await expect(tree(page).getByRole('treeitem', { name: /^tax\.ts/ })).toHaveCount(0)
  })

  test('keeps the Typika files from being renamed or deleted', async ({ page }) => {
    await openStrategy(page)

    await tree(page).getByRole('treeitem', { name: 'typika.toml, lecture seule' }).focus()
    await page.keyboard.press('F2')
    await page.keyboard.press('Delete')

    await expect(
      page.getByText('Ce fichier est en lecture seule : il ne peut être ni renommé ni supprimé.')
    ).toBeVisible()
    await expect(page.getByRole('textbox', { name: /Nouveau nom/ })).toHaveCount(0)
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
  })

  test('deletes a file, keeps it deleted after a reload, and brings it back on reset', async ({ page }) => {
    await openStrategy(page)

    await tree(page).getByRole('treeitem', { name: 'README.md' }).click()
    await expect(tab(page, 'README.md')).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Delete')
    const dialog = page.getByRole('alertdialog', { name: 'Supprimer « README.md » ?' })
    await dialog.getByRole('button', { name: 'Supprimer' }).click()

    await expect(tree(page).getByRole('treeitem', { name: /^README\.md/ })).toHaveCount(0)
    await expect(tab(page, 'README.md')).toHaveCount(0)
    await expect(status(page)).toHaveText('Modifié')

    await page.reload()
    await expect(tree(page).getByRole('treeitem', { name: 'src' })).toBeVisible()
    await expect(tree(page).getByRole('treeitem', { name: /^README\.md/ })).toHaveCount(0)

    await page.getByRole('button', { name: 'Réinitialiser' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Réinitialiser' }).click()
    await expect(tree(page).getByRole('treeitem', { name: 'README.md' })).toBeVisible()
  })

  test('deletes a folder and its files from the context menu', async ({ page }) => {
    await openStrategy(page)

    await tree(page)
      .getByRole('treeitem', { name: 'shop' })
      .click({ button: 'right', position: { x: 40, y: 8 } })
    await page.getByRole('menuitem', { name: 'Supprimer' }).click()
    const dialog = page.getByRole('alertdialog', { name: 'Supprimer « shop » ?' })
    await expect(dialog).toContainText('src/shop/money.ts')
    await expect(dialog).toContainText('src/shop/order.ts')
    await dialog.getByRole('button', { name: 'Supprimer' }).click()

    await expect(tree(page).getByRole('treeitem', { name: 'shop' })).toHaveCount(0)
    await expect(tree(page).getByRole('treeitem', { name: 'main.ts' })).toBeFocused()
  })

  test('removes a created file when the project is reset', async ({ page }) => {
    await openStrategy(page)

    await page.getByRole('button', { name: 'Nouveau fichier' }).click()
    const name = page.getByRole('textbox', { name: 'Nom du nouveau fichier' })
    await name.fill('notes.md')
    await name.press('Enter')
    await expect(tab(page, 'notes.md')).toHaveAttribute('aria-selected', 'true')

    await page.getByRole('button', { name: 'Réinitialiser' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Réinitialiser' }).click()

    await expect(status(page)).not.toHaveText('Modifié')
    await expect(tree(page).getByRole('treeitem', { name: /^notes\.md/ })).toHaveCount(0)
    await expect(tab(page, 'notes.md')).toHaveCount(0)
  })
})
