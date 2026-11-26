import { readFile } from 'node:fs/promises'

import { expect, test, type Browser, type Page } from '@playwright/test'
import { strFromU8, unzipSync } from 'fflate'

const TIMEOUT = 60_000

const editor = (page: Page) => page.getByRole('textbox', { name: 'Éditeur' })
const status = (page: Page) => page.getByRole('status', { name: 'État du projet' })
const newProjectDialog = (page: Page) => page.getByRole('dialog', { name: 'Nouveau projet' })
const consoleRegion = (page: Page) => page.getByRole('region', { name: 'Console' })
const results = (page: Page) => page.getByRole('region', { name: 'Résultats des tests' })
const projectRow = (page: Page, name: string) =>
  page
    .getByRole('list', { name: 'Projets' })
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name, exact: true }) })

const createBlank = async (page: Page, name: string, language: string) => {
  await page.goto('/projects')
  await page.getByRole('button', { name: 'Nouveau projet' }).click()
  const dialog = newProjectDialog(page)
  await dialog.getByRole('textbox', { name: 'Nom du projet' }).fill(name)
  await dialog.getByRole('radio', { name: language }).check()
  await dialog.getByRole('button', { name: 'Créer le projet' }).click()
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('tree', { name: 'Fichiers' })).toBeVisible({ timeout: TIMEOUT })
}

const runAndTest = async (page: Page) => {
  await expect(page.getByRole('button', { name: 'Tests', exact: true })).toBeEnabled({ timeout: TIMEOUT })
  await page.getByRole('button', { name: 'Exécuter' }).click()
  await expect(consoleRegion(page).getByText('Hello, world!')).toBeVisible({ timeout: TIMEOUT })
  await page.getByRole('button', { name: 'Tests', exact: true }).click()
  await expect(results(page).getByText('1 réussi')).toBeVisible({ timeout: TIMEOUT })
}

const editFile = async (page: Page, file: RegExp, line: string) => {
  await page.getByRole('treeitem', { name: file }).click()
  await editor(page).click()
  await page.keyboard.insertText(`${line}\n`)
  await expect(status(page)).toHaveText('Modifié')
}

const openInFreshContext = async (browser: Browser, url: string) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(url)
  return page
}

test.describe('new blank project', () => {
  for (const [language, entry] of [
    ['TypeScript', /^main\.ts/],
    ['JavaScript', /^main\.js/],
    ['Go', /^main\.go/],
  ] as const) {
    test(`creates a ${language} project that runs and passes its test`, async ({ page }) => {
      test.slow()
      await createBlank(page, `Bac à sable ${language}`, language)

      await expect(page.getByRole('treeitem', { name: entry })).toBeVisible()
      await runAndTest(page)

      await page.goto('/projects')
      await expect(projectRow(page, `Bac à sable ${language}`)).toContainText(`Projet personnel · ${language}`)
    })
  }

  test('creates a Kotlin project that runs and passes its test', async ({ page }) => {
    test.slow()
    await createBlank(page, 'Bac à sable Kotlin', 'Kotlin')

    await expect(page.getByRole('treeitem', { name: /^Main\.kt/ })).toBeVisible()
    await runAndTest(page)
  })

  test('resets a blank project to the state it was created in', async ({ page }) => {
    await createBlank(page, 'À remettre', 'TypeScript')
    await editFile(page, /^greeting\.ts/, '// my change')

    await page.getByRole('button', { name: 'Réinitialiser' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Réinitialiser' }).click()

    await expect(status(page)).not.toHaveText('Modifié')
    await expect(editor(page)).not.toContainText('// my change')
  })

  test('exports a blank project with its manifest', async ({ page }) => {
    await createBlank(page, 'À exporter', 'Go')

    await page.goto('/projects')
    await projectRow(page, 'À exporter').getByRole('button', { name: 'Exporter' }).click()
    const dialog = page.getByRole('dialog', { name: 'Exporter le projet' })
    const downloading = page.waitForEvent('download')
    await dialog.getByRole('button', { name: 'Télécharger le zip' }).click()
    const entries = unzipSync(new Uint8Array(await readFile(await (await downloading).path())))

    expect(Object.keys(entries).toSorted()).toEqual([
      'LICENSE',
      'README.md',
      'cmd/app/main.go',
      'go.mod',
      'internal/greeting/greeting.go',
      'internal/greeting/greeting_test.go',
      'typika.toml',
    ])
    expect(strFromU8(entries['typika.toml'] ?? new Uint8Array())).toContain('name = "a-exporter"')
  })

  test('shares a blank project by link, and opens it in another browser', async ({ page, browser }) => {
    await createBlank(page, 'À partager', 'TypeScript')
    await editFile(page, /^greeting\.ts/, '// shared change')

    await page.getByRole('button', { name: 'Partager' }).click()
    const shareDialog = page.getByRole('dialog', { name: 'Partager le projet' })
    const link = shareDialog.getByRole('textbox', { name: 'Lien de partage' })
    await expect(link).toHaveValue(/\/s#1\./)
    const url = await link.inputValue()

    const other = await openInFreshContext(browser, url)
    await expect(other.getByRole('region', { name: 'Projet partagé' })).toContainText('Projet personnel partagé')
    await other.getByRole('treeitem', { name: /^greeting\.ts/ }).click()
    await expect(editor(other)).toContainText('// shared change')
    await other.context().close()
  })
})

test.describe('new project from the library', () => {
  test('starts a project of my own from a template page, apart from the template', async ({ page }) => {
    test.slow()
    await page.goto('/templates/strategy-ts')
    await page.getByRole('link', { name: 'En faire un projet' }).click()

    const dialog = newProjectDialog(page)
    await expect(dialog.getByRole('tab', { name: 'Bibliothèque' })).toHaveAttribute('aria-selected', 'true')
    await expect(dialog.getByRole('radio', { name: /^Strategy.* · TypeScript$/ })).toBeChecked()
    await dialog.getByRole('textbox', { name: 'Nom du projet' }).fill('Ma stratégie')
    await dialog.getByRole('button', { name: 'Créer le projet' }).click()
    await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/)
    await editFile(page, /standard\.ts/, '// my strategy')

    await page.goto('/play/strategy-ts')
    await expect(page.getByRole('treeitem', { name: 'standard.ts', exact: true })).toBeVisible({ timeout: TIMEOUT })

    await page.goto('/projects')
    await expect(projectRow(page, 'Ma stratégie')).toContainText('Projet personnel · TypeScript')
    await expect(page.getByRole('link', { name: 'strategy-ts', exact: true })).toHaveCount(0)
  })

  test('finds a template of the library by searching', async ({ page }) => {
    await page.goto('/projects')
    await page.getByRole('button', { name: 'Nouveau projet' }).click()
    const dialog = newProjectDialog(page)
    await dialog.getByRole('tab', { name: 'Bibliothèque' }).click()

    await dialog.getByRole('searchbox', { name: 'Rechercher un template' }).fill('observer')
    await dialog.getByRole('radio', { name: /^Observer.* · JavaScript$/ }).check()
    await dialog.getByRole('button', { name: 'Créer le projet' }).click()

    await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/)
    await expect(page.getByRole('treeitem', { name: /^main\.js/ })).toBeVisible({ timeout: TIMEOUT })
  })
})
