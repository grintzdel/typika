import { expect, test } from '@playwright/test'

import { APP_URL } from './production-urls.ts'

test.skip(process.env.TYPIKA_E2E_APP_URL !== undefined, 'needs the fake GitHub of the local production server')

test('signs in to GitHub, shares a gist and reopens it under the production policies', async ({ page, browser }) => {
  const violations: Array<string> = []
  page.on('console', (message) => {
    if (/Content Security Policy|Cross-Origin/i.test(message.text())) violations.push(message.text())
  })
  const gist = page.getByRole('dialog', { name: 'Partager le projet' }).getByRole('region', { name: 'Gist GitHub' })

  await page.goto(`${APP_URL}/play/strategy-ts`)
  await page.getByRole('button', { name: 'Partager' }).click()
  await gist.getByRole('button', { name: 'Se connecter à GitHub' }).click()
  await gist.getByRole('button', { name: 'Créer le gist' }).click()
  const link = gist.getByRole('textbox', { name: 'Lien du gist' })
  await expect(link).toHaveValue(/\/g\/[0-9a-f]+$/)

  const context = await browser.newContext()
  const other = await context.newPage()
  const response = await other.goto(await link.inputValue())
  await expect(other.getByRole('region', { name: 'Projet partagé' })).toContainText('Strategy')
  expect(response?.headers()['cross-origin-opener-policy']).toBe('same-origin')
  expect(violations).toEqual([])
  await context.close()
})
