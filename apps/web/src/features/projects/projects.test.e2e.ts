import { expect, test, type Page } from '@playwright/test'

const editor = (page: Page) => page.getByRole('textbox', { name: 'Éditeur' })
const status = (page: Page) => page.getByRole('status', { name: 'État du projet' })
const projects = (page: Page) => page.getByRole('list', { name: 'Projets' })
const projectRow = (page: Page, name: string) =>
  projects(page)
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name, exact: true }) })

const editStrategy = async (page: Page, line: string) => {
  await page.goto('/play/strategy-ts')
  await page.getByRole('treeitem', { name: /standard\.ts/ }).click()
  await editor(page).click()
  await page.keyboard.insertText(`${line}\n`)
  await expect(status(page)).toHaveText('Modifié')
}

const editExpressOfOpenedProject = async (page: Page, line: string) => {
  await page.getByRole('treeitem', { name: /express\.ts/ }).click()
  await editor(page).click()
  await page.keyboard.insertText(`${line}\n`)
  await expect(page.getByRole('treeitem', { name: 'express.ts, modifié' })).toBeVisible()
}

test.describe('local projects', () => {
  test('explains that projects stay in this browser when there are none', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Principale' }).getByRole('link', { name: 'Mes projets' }).click()

    await expect(page).toHaveURL('/projects')
    await expect(page.getByRole('heading', { level: 1, name: 'Mes projets' })).toBeVisible()
    await expect(page.getByText(/restent dans ce navigateur/)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Parcourir les templates' })).toHaveAttribute('href', '/templates')
  })

  test('lists a modified template and opens it by its id', async ({ page }) => {
    await editStrategy(page, '// first edit')

    await page.goto('/projects')
    const row = projectRow(page, 'strategy-ts')
    await expect(row).toContainText('Strategy')
    await expect(row).toContainText('TypeScript')
    await expect(page.getByText(/Espace utilisé/)).toBeVisible()

    await row.getByRole('link', { name: 'strategy-ts', exact: true }).click()
    await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/)
    await expect(status(page)).toHaveText('Modifié')
    await page.getByRole('treeitem', { name: /standard\.ts/ }).click()
    await expect(editor(page)).toContainText('// first edit')
  })

  test('keeps the edits of a copy apart from its original', async ({ page }) => {
    await editStrategy(page, '// original edit')

    await page.goto('/projects')
    await projectRow(page, 'strategy-ts').getByRole('button', { name: 'Dupliquer' }).click()
    await projectRow(page, 'strategy-ts (copie)').getByRole('link', { name: 'strategy-ts (copie)' }).click()
    await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/)
    await editExpressOfOpenedProject(page, '// copy edit')
    const copyUrl = page.url()

    await page.goto('/projects')
    await projectRow(page, 'strategy-ts').getByRole('link', { name: 'strategy-ts', exact: true }).click()
    await expect(page.getByRole('treeitem', { name: 'standard.ts, modifié' })).toBeVisible()
    await expect(page.getByRole('treeitem', { name: 'express.ts', exact: true })).toBeVisible()

    await page.goto(copyUrl)
    await page.getByRole('treeitem', { name: /express\.ts/ }).click()
    await expect(editor(page)).toContainText('// copy edit')
    await page.getByRole('treeitem', { name: /standard\.ts/ }).click()
    await expect(editor(page)).toContainText('// original edit')
  })

  test('renames a project', async ({ page }) => {
    await editStrategy(page, '// edit')

    await page.goto('/projects')
    await projectRow(page, 'strategy-ts').getByRole('button', { name: 'Renommer' }).click()
    const name = page.getByRole('textbox', { name: 'Nom du projet' })
    await name.fill('My pricing')
    await name.press('Enter')

    await expect(projectRow(page, 'My pricing')).toBeVisible()
    await page.reload()
    await expect(projectRow(page, 'My pricing')).toBeVisible()
    await expect(projectRow(page, 'strategy-ts')).toHaveCount(0)
  })

  test('deletes a project after confirmation', async ({ page }) => {
    await editStrategy(page, '// edit')

    await page.goto('/projects')
    await projectRow(page, 'strategy-ts').getByRole('button', { name: 'Supprimer' }).click()
    const dialog = page.getByRole('alertdialog', { name: 'Supprimer « strategy-ts » ?' })
    await dialog.getByRole('button', { name: 'Supprimer' }).click()

    await expect(projects(page)).toHaveCount(0)
    await page.reload()
    await expect(page.getByText(/restent dans ce navigateur/)).toBeVisible()

    await page.goto('/play/strategy-ts')
    await expect(page.getByRole('tree', { name: 'Fichiers' })).toBeVisible()
    await expect(status(page)).toBeEmpty()
  })

  test('says when a project does not exist in this browser', async ({ page }) => {
    await page.goto('/p/00000000-0000-4000-8000-000000000000')

    await expect(page.getByText('Ce projet n’existe pas dans ce navigateur.')).toBeVisible()
  })
})
