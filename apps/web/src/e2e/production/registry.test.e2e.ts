import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

import { APP_URL, TEST_REGISTRY_URL } from './production-urls.ts'

const CLIENT_ASSETS = join(import.meta.dirname, '..', '..', '..', 'dist', 'client', 'assets')

test('opens a template served by the registry, at its pinned commit', async ({ page }) => {
  const registryRequests: Array<string> = []
  page.on('request', (request) => {
    if (request.url().startsWith(TEST_REGISTRY_URL)) registryRequests.push(request.url())
  })

  await page.goto(`${APP_URL}/play/strategy-ts`)

  await expect(page.getByRole('tree', { name: 'Fichiers' })).toBeVisible({ timeout: 30_000 })
  expect(registryRequests).toContain(`${TEST_REGISTRY_URL}/index.json`)
  expect(
    registryRequests.some((url) => /\/gh\/typika\/templates@[0-9a-f]{12}\/strategy\/ts\/typika\.toml$/.test(url))
  ).toBe(true)
})

test('reads the registry for a hub page that was not prerendered', async ({ page }) => {
  const registryRequests: Array<string> = []
  page.on('request', (request) => {
    if (request.url().startsWith(TEST_REGISTRY_URL)) registryRequests.push(request.url())
  })

  await page.goto(`${APP_URL}/templates/does-not-exist`)

  await expect(page.getByRole('link', { name: 'Voir tous les templates' })).toBeVisible()
  expect(registryRequests).toEqual([`${TEST_REGISTRY_URL}/index.json`])
})

test('does not embed the templates in the app bundle', async () => {
  test.skip(process.env.TYPIKA_E2E_APP_URL !== undefined, 'the bundle of a deployed instance is not on disk')
  const manifest = await readFile(
    join(import.meta.dirname, '..', '..', '..', '..', '..', 'templates', 'strategy', 'ts', 'typika.toml'),
    'utf8'
  )
  const scripts = (await readdir(CLIENT_ASSETS)).filter((file) => file.endsWith('.js'))

  const contents = await Promise.all(scripts.map((file) => readFile(join(CLIENT_ASSETS, file), 'utf8')))

  expect(scripts.length).toBeGreaterThan(0)
  expect(contents.filter((content) => content.includes('name = "strategy-ts"'))).toEqual([])
  expect(manifest).toContain('name = "strategy-ts"')
})
