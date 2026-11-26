import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

import { expect, test, type Page } from '@playwright/test'
import { zipSync } from 'fflate'

const TIMEOUT = 60_000
const TEMPLATES_DIR = join(import.meta.dirname, '..', '..', '..', '..', '..', 'templates')

const newProjectDialog = (page: Page) => page.getByRole('dialog', { name: 'Nouveau projet' })
const projectRow = (page: Page, name: string) =>
  page
    .getByRole('list', { name: 'Projets' })
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name, exact: true }) })

const openTab = async (page: Page, tab: string) => {
  await page.goto('/projects')
  await page.getByRole('button', { name: 'Nouveau projet' }).click()
  await newProjectDialog(page).getByRole('tab', { name: tab }).click()
  return newProjectDialog(page).getByRole('tabpanel', { name: tab })
}

const importUrl = async (page: Page, url: string) => {
  const dialog = await openTab(page, 'Depuis une URL')
  await dialog.getByRole('textbox', { name: 'Adresse du template' }).fill(url)
  await dialog.getByRole('button', { name: 'Créer le projet' }).click()
  return dialog
}

const importFile = async (page: Page, name: string, buffer: Buffer) => {
  const dialog = await openTab(page, 'Importer un fichier')
  await dialog
    .getByLabel('Fichier typika.toml ou zip')
    .setInputFiles({ name, mimeType: 'application/octet-stream', buffer })
  await dialog.getByRole('button', { name: 'Créer le projet' }).click()
  return dialog
}

const expectOpenedProject = async (page: Page) => {
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('tree', { name: 'Fichiers' })).toBeVisible({ timeout: TIMEOUT })
}

const filesUnder = async (dir: string): Promise<Record<string, Buffer>> => {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true })
  const files = entries.filter((entry) => entry.isFile())
  return Object.fromEntries(
    await Promise.all(
      files.map(async (entry) => {
        const path = join(entry.parentPath, entry.name)
        return [relative(dir, path), await readFile(path)] as const
      })
    )
  )
}

const MANIFEST = `schema = 1
name = "pricing-rules-ts"
title = "Pricing rules"
summary = "Prices computed by a set of rules."
license = "MIT-0"
authors = ["github:octocat"]

[facets]
language = "typescript"
topic = ["design-pattern/behavioral/strategy"]
level = "beginner"

[runtime]
kind = "browser-js"
entry = "src/pricing.ts"

[commands]
test = "vitest"
`

test.describe('new project from a URL', () => {
  test('copies a template of the catalogue from its reference', async ({ page }) => {
    await importUrl(page, 'github:typika-app/templates/strategy/ts')

    await expectOpenedProject(page)
    await expect(page.getByRole('treeitem', { name: /standard\.ts/ })).toBeVisible()
    await page.goto('/projects')
    await expect(projectRow(page, 'Strategy: shipping options')).toContainText('Projet personnel · TypeScript')
  })

  test('downloads a template from GitHub', async ({ page }) => {
    const files = await filesUnder(join(TEMPLATES_DIR, 'strategy-base', 'ts'))
    const paths = Object.keys(files)
    await page.route('**/repos/octocat/patterns/**', async (route) => {
      const url = route.request().url()
      if (url.includes('/commits/')) return route.fulfill({ json: { sha: '0123456789abcdef0123' } })
      if (url.includes('/git/trees/'))
        return route.fulfill({
          json: {
            truncated: false,
            tree: paths.map((path, index) => ({
              path: `shipping/${path}`,
              type: 'blob',
              sha: `blob${index}`,
              size: files[path]?.length,
            })),
          },
        })
      const index = Number(/blob(\d+)$/.exec(url)?.[1])
      return route.fulfill({
        json: { encoding: 'base64', content: files[paths[index] ?? '']?.toString('base64') ?? '' },
      })
    })

    await importUrl(page, 'https://github.com/octocat/patterns/tree/main/shipping')

    await expectOpenedProject(page)
    await expect(page.getByRole('treeitem', { name: /shipping-rules\.ts/ })).toBeVisible()
    await page.goto('/projects')
    await expect(projectRow(page, 'Strategy base: shipping options')).toContainText('Projet personnel')
  })

  test('explains an address that names no template', async ({ page }) => {
    const dialog = await importUrl(page, 'https://example.com/strategy')

    await expect(dialog.getByRole('alert')).toContainText('Cette adresse ne désigne aucun template')
    await expect(page).toHaveURL('/projects')
  })
})

test.describe('new project from a file', () => {
  test('gives a lone typika.toml a starter project that runs', async ({ page }) => {
    test.slow()
    await importFile(page, 'typika.toml', Buffer.from(MANIFEST))

    await expectOpenedProject(page)
    await expect(page.getByRole('treeitem', { name: /^pricing\.ts/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tests', exact: true })).toBeEnabled({ timeout: TIMEOUT })
    await page.getByRole('button', { name: 'Exécuter' }).click()
    await expect(page.getByRole('region', { name: 'Console' }).getByText('Hello, world!')).toBeVisible({
      timeout: TIMEOUT,
    })
  })

  test('lists the issues of a manifest that is not valid', async ({ page }) => {
    const dialog = await importFile(page, 'typika.toml', Buffer.from(MANIFEST.replace('beginner', 'expert')))

    const alert = dialog.getByRole('alert')
    await expect(alert).toContainText('Le typika.toml n’est pas valide')
    await expect(alert.getByRole('listitem')).toContainText('facets.level')
    await expect(page).toHaveURL('/projects')
  })

  test('opens a zip exported by Typika with its files', async ({ page }) => {
    const files = await filesUnder(join(TEMPLATES_DIR, 'strategy-base', 'ts'))
    const zip = zipSync(
      Object.fromEntries(Object.entries(files).map(([path, content]) => [path, new Uint8Array(content)]))
    )

    await importFile(page, 'strategy-base.zip', Buffer.from(zip))

    await expectOpenedProject(page)
    await expect(page.getByRole('treeitem', { name: /shipping-rules\.ts/ })).toBeVisible()
  })

  test('explains a zip without a typika.toml', async ({ page }) => {
    const zip = zipSync({ 'src/main.ts': new TextEncoder().encode("console.log('hi')\n") })

    const dialog = await importFile(page, 'project.zip', Buffer.from(zip))

    await expect(dialog.getByRole('alert')).toContainText('Aucun typika.toml')
  })
})
