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
