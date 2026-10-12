import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

import { APP_URL } from './production-urls.ts'

const CLIENT_ASSETS = join(import.meta.dirname, '..', '..', '..', 'dist', 'client', 'assets')

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('reads the home page', async ({ page }) => {
    await page.goto(`${APP_URL}/`)

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(
      page.getByRole('region', { name: 'Design patterns' }).getByRole('link', { name: /^Strategy/ })
    ).toHaveAttribute('href', '/templates/strategy-ts')
  })

  test('reads the list of templates', async ({ page }) => {
    await page.goto(`${APP_URL}/templates`)

    const results = page.getByRole('list', { name: 'Templates' })
    await expect(results.getByRole('listitem')).toHaveCount(26)
    await expect(results.getByRole('link', { name: /Strategy: shipping options.*Go/ })).toHaveAttribute(
      'href',
      '/templates/strategy-go'
    )
  })

  test('sends a search from the header to the list', async ({ page }) => {
    await page.goto(`${APP_URL}/`)

    await page.getByRole('searchbox', { name: 'Search templates' }).fill('switch')
    await page.getByRole('searchbox', { name: 'Search templates' }).press('Enter')

    await expect(page).toHaveURL(`${APP_URL}/templates?q=switch`)
    await expect(page.getByRole('list', { name: 'Templates' }).getByRole('listitem')).toHaveCount(26)
  })

  test('reads a template page', async ({ page }) => {
    await page.goto(`${APP_URL}/templates/strategy-ts`)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Strategy: shipping options')
    await expect(page.getByRole('link', { name: /sandbox/i })).toHaveAttribute('href', '/play/strategy-ts')
    await expect(page.getByText('strategy-base-ts')).toBeVisible()
  })
})

test('restores the filters of a list URL after a reload, within the content security policy', async ({ page }) => {
  const violations: Array<string> = []
  page.on('console', (message) => {
    if (message.text().includes('Content Security Policy')) violations.push(message.text())
  })
  await page.goto(`${APP_URL}/templates`)
  await page.getByRole('group', { name: 'Langage' }).getByRole('checkbox', { name: 'Go' }).check()
  await expect(page).toHaveURL(`${APP_URL}/templates?language=go`)

  await page.reload()

  await expect(page.getByRole('group', { name: 'Langage' }).getByRole('checkbox', { name: 'Go' })).toBeChecked()
  await expect(page.getByRole('list', { name: 'Templates' }).getByRole('listitem')).toHaveCount(6)
  expect(violations).toEqual([])
})

test('restores a search after a reload', async ({ page }) => {
  await page.goto(`${APP_URL}/templates?language=typescript&q=switch`)

  await expect(page.getByRole('searchbox', { name: 'Rechercher des templates' })).toHaveValue('switch')
  await expect(
    page.getByRole('list', { name: 'Templates' }).getByRole('link', { name: /^Strategy: shipping options/ })
  ).toHaveAttribute('href', '/templates/strategy-ts')
})

for (const path of ['/', '/templates', '/templates/strategy-ts'])
  test(`hydrates ${path} and switches to the browser language without an error`, async ({ page }) => {
    const errors: Array<string> = []
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('pageerror', (error) => errors.push(error.message))

    await page.goto(`${APP_URL}${path}`)

    await expect(page.getByRole('navigation', { name: 'Principale' })).toBeVisible()
    expect(errors).toEqual([])
  })

test('keeps the registry index out of the app bundle', async () => {
  test.skip(process.env.TYPIKA_E2E_APP_URL !== undefined, 'the bundle of a deployed instance is not on disk')
  const scripts = (await readdir(CLIENT_ASSETS)).filter((file) => file.endsWith('.js'))

  const contents = await Promise.all(scripts.map((file) => readFile(join(CLIENT_ASSETS, file), 'utf8')))

  expect(contents.filter((content) => content.includes('Pick an algorithm at runtime'))).toEqual([])
})
