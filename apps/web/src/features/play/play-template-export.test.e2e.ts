import { readFile } from 'node:fs/promises'

import { expect, test, type Page } from '@playwright/test'
import { strFromU8, unzipSync } from 'fflate'

const download = async (page: Page, includeTypikaFiles: boolean) => {
  await page.getByRole('button', { name: 'Exporter' }).click()
  const dialog = page.getByRole('dialog', { name: 'Exporter le projet' })
  const typikaFiles = dialog.getByRole('checkbox', { name: /Inclure les fichiers Typika/ })
  if (includeTypikaFiles) await expect(typikaFiles).toBeChecked()
  else await typikaFiles.uncheck()
  const downloading = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Télécharger le zip' }).click()
  const file = await downloading
  const entries = unzipSync(new Uint8Array(await readFile(await file.path())))
  return {
    name: file.suggestedFilename(),
    paths: Object.keys(entries).toSorted(),
    text: (path: string) => strFromU8(entries[path] ?? new Uint8Array()),
  }
}

test.describe('export as a zip', () => {
  test('exports the edited project with its Typika files', async ({ page }) => {
    await page.goto('/play/strategy-ts')
    await page.getByRole('treeitem', { name: /standard\.ts/ }).click()
    await page.getByRole('textbox', { name: 'Éditeur' }).click()
    await page.keyboard.insertText('// exported edit\n')

    const archive = await download(page, true)

    expect(archive.name).toBe('strategy-ts.zip')
    expect(archive.paths).toEqual(expect.arrayContaining(['package.json', 'typika.toml', 'tour/01-overview.md']))
    expect(archive.paths.some((path) => path.startsWith('exercises/'))).toBe(false)
    expect(archive.text('src/checkout/options/standard.ts')).toContain('// exported edit')
    expect(archive.text('typika.toml')).toMatch(/^parent = "github:[^"]+\/strategy\/ts(@[0-9a-f]{12})?"$/m)
  })

  for (const [template, toolFile] of [
    ['strategy-ts', 'package.json'],
    ['strategy-go', 'go.mod'],
    ['strategy-kotlin', 'build.gradle.kts'],
  ] as const)
    test(`exports ${template} without its Typika files`, async ({ page }) => {
      await page.goto(`/play/${template}`)
      await expect(page.getByRole('tree', { name: 'Fichiers' })).toBeVisible()

      const archive = await download(page, false)

      expect(archive.paths).toContain(toolFile)
      expect(archive.paths).toContain('README.md')
      expect(archive.paths.filter((path) => path === 'typika.toml' || path.startsWith('tour/'))).toEqual([])
    })

  test('exports a project from my projects', async ({ page }) => {
    await page.goto('/play/strategy-ts')
    await page.getByRole('treeitem', { name: /standard\.ts/ }).click()
    await page.getByRole('textbox', { name: 'Éditeur' }).click()
    await page.keyboard.insertText('// from my projects\n')
    await expect(page.getByRole('status', { name: 'État du projet' })).toHaveText('Modifié')

    await page.goto('/projects')
    const archive = await download(page, true)

    expect(archive.name).toBe('strategy-ts.zip')
    expect(archive.text('src/checkout/options/standard.ts')).toContain('// from my projects')
  })
})
