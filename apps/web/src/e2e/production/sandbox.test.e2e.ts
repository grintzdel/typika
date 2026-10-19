import { expect, test } from '@playwright/test'

import { APP_URL } from './production-urls.ts'

test('runs the tests of a template under the production policies', async ({ page }) => {
  const violations: Array<string> = []
  page.on('console', (message) => {
    if (/Content Security Policy|Cross-Origin/i.test(message.text())) violations.push(message.text())
  })

  await page.goto(`${APP_URL}/play/strategy-ts`)
  await page.getByRole('button', { name: 'Tests', exact: true }).click()

  const results = page.getByRole('region', { name: 'Résultats des tests' })
  await expect(results.getByText(/^\d+ réussis$/)).toBeVisible({ timeout: 30_000 })
  await expect(results.getByText('0 échec')).toBeVisible()
  const frame = page.frames().find((candidate) => candidate.url().includes('/runtime/frame.html'))
  expect(await frame?.evaluate(() => self.crossOriginIsolated)).toBe(true)
  expect(violations).toEqual([])
})

test('checks TypeScript in the editor under the production policies', async ({ page }) => {
  const violations: Array<string> = []
  page.on('console', (message) => {
    if (/Content Security Policy|Cross-Origin|Embedder/i.test(message.text())) violations.push(message.text())
  })

  await page.goto(`${APP_URL}/play/strategy-ts`)
  const editor = page.getByRole('textbox', { name: 'Éditeur' })
  await editor.click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.type("\nconst total: number = 'free'")

  await expect(page.locator('.cm-lintRange-error').first()).toBeVisible({ timeout: 30_000 })
  expect(violations).toEqual([])
})

test('runs a Go template from brotli assets under the production policies', async ({ page }) => {
  const violations: Array<string> = []
  const encodings: Array<string | undefined> = []
  page.on('console', (message) => {
    if (/Content Security Policy|Cross-Origin|Embedder/i.test(message.text())) violations.push(message.text())
  })
  page.on('response', (response) => {
    if (response.url().endsWith('/compile.wasm')) encodings.push(response.headers()['content-encoding'])
  })

  await page.goto(`${APP_URL}/play/strategy-go`)
  await page.getByRole('button', { name: 'Tests', exact: true }).click()

  const results = page.getByRole('region', { name: 'Résultats des tests' })
  await expect(results.getByText('12 réussis')).toBeVisible({ timeout: 60_000 })
  await expect(results.getByText('0 échec')).toBeVisible()
  expect(encodings).toEqual(['br'])
  expect(violations).toEqual([])
})

test('opens a shared link at the pinned template, in another browser', async ({ page, browser }) => {
  await page.goto(`${APP_URL}/play/strategy-ts`)
  await page.getByRole('treeitem', { name: /standard\.ts/ }).click()
  await page.getByRole('textbox', { name: 'Éditeur' }).click()
  await page.keyboard.insertText('// shared in production\n')
  await expect(page.getByRole('status', { name: 'État du projet' })).toHaveText('Modifié')
  await page.getByRole('button', { name: 'Partager' }).click()
  const link = page.getByRole('dialog', { name: 'Partager le projet' }).getByRole('textbox', { name: 'Lien de partage' })
  await expect(link).toHaveValue(new RegExp(`^${APP_URL}/s#1\\.`))

  const context = await browser.newContext()
  const other = await context.newPage()
  await other.goto(await link.inputValue())
  await expect(other.getByRole('treeitem', { name: 'standard.ts, modifié' })).toBeVisible()
  await other.getByRole('button', { name: 'Tests', exact: true }).click()
  const results = other.getByRole('region', { name: 'Résultats des tests' })
  await expect(results.getByText(/^\d+ réussis$/)).toBeVisible({ timeout: 30_000 })
  await context.close()
})
