import { expect, test, type FrameLocator } from '@playwright/test'

import {
  hostMessages,
  INSECURE_HOST,
  openHostPage,
  postToEmbed,
  SECURE_HOST,
  serveHostPages,
  WITHOUT_LOCAL_NETWORK_CHECKS,
} from '../../e2e/fixtures/embed-host.fixture.ts'

const TIMEOUT = 60_000

test.use(WITHOUT_LOCAL_NETWORK_CHECKS)

test.beforeEach(async ({ context, baseURL }) => {
  await serveHostPages(context, baseURL ?? '')
})

const editor = (embed: FrameLocator) => embed.getByRole('textbox', { name: 'Éditeur' })
const results = (embed: FrameLocator) => embed.getByRole('region', { name: 'Résultats des tests' })

const runTests = async (embed: FrameLocator, passed: string) => {
  await embed.getByRole('button', { name: 'Tests', exact: true }).click()
  await expect(results(embed).getByText(passed)).toBeVisible({ timeout: TIMEOUT })
}

test.describe('Embed', () => {
  test('starts the runtime on the first click, then reports the tests to the host page', async ({ page }) => {
    const frames: Array<string> = []
    page.on('request', (request) => {
      if (request.url().includes('/runtime/frame.html')) frames.push(request.url())
    })
    const embed = await openHostPage(page, SECURE_HOST, '/embed/strategy-ts')
    await expect(editor(embed)).toContainText('quoteShipping')
    await expect
      .poll(() => hostMessages(page))
      .toContainEqual({
        origin: 'http://localhost:3000',
        data: { type: 'typika:ready' },
      })

    expect(frames).toEqual([])

    await runTests(embed, '11 réussis')
    await expect
      .poll(() => hostMessages(page))
      .toContainEqual({
        origin: 'http://localhost:3000',
        data: { type: 'typika:test-result', passed: 11, failed: 0 },
      })
    expect(frames).toHaveLength(1)
  })

  test('runs the program on load when asked to', async ({ page }) => {
    const embed = await openHostPage(page, SECURE_HOST, '/embed/strategy-ts?run=auto')

    await expect(embed.getByRole('region', { name: 'Console' }).getByText('Terminé avec le code 0')).toBeVisible({
      timeout: TIMEOUT,
    })
  })

  test('opens the requested file with its lines highlighted', async ({ page }) => {
    const embed = await openHostPage(
      page,
      SECURE_HOST,
      '/embed/strategy-ts?file=src/checkout/shipping-cost.ts&lines=L1-L3&panel=none'
    )

    await expect(embed.getByRole('combobox', { name: 'Fichier' })).toHaveValue('src/checkout/shipping-cost.ts')
    await expect(editor(embed)).toContainText('ShippingCost')
    await expect(embed.locator('.cm-typika-tour-line')).toHaveCount(3)
    await expect(embed.getByRole('region', { name: 'Console' })).toHaveCount(0)
  })

  test('loads IntelliSense only once the reader edits the code', async ({ page }) => {
    const workers: Array<string> = []
    page.on('request', (request) => {
      if (/language-service\.worker(\.ts|-[\w-]+\.js)/.test(request.url())) workers.push(request.url())
    })
    const embed = await openHostPage(page, SECURE_HOST, '/embed/strategy-ts')
    await expect(editor(embed)).toContainText('quoteShipping')
    await page.waitForTimeout(500)

    expect(workers).toEqual([])

    await editor(embed).click()

    await expect.poll(() => workers.length).toBeGreaterThan(0)
  })

  test('keeps the code as it is when read-only', async ({ page }) => {
    const embed = await openHostPage(page, SECURE_HOST, '/embed/strategy-ts?readonly=true')
    await expect(editor(embed)).toContainText('quoteShipping')

    await editor(embed).click()
    await page.keyboard.type('READONLY')

    await expect(editor(embed)).not.toContainText('READONLY')
  })

  test('shows the tour step the host page asks for', async ({ page }) => {
    const embed = await openHostPage(page, SECURE_HOST, '/embed/strategy-ts?tour-step=overview')
    const step = embed.getByRole('region', { name: 'Étape du tour' })
    await expect(step.getByRole('heading')).toHaveText('Two ways to ship, two ways to price')

    await postToEmbed(page, { type: 'typika:goto-step', id: 'strategy-interface' })

    await expect(step.getByRole('heading')).toHaveText('One interface, many prices')
    await expect(embed.getByRole('combobox', { name: 'Fichier' })).toHaveValue('src/checkout/shipping-cost.ts')
  })

  test('follows the theme of the host page, and ignores the messages it does not know', async ({ page }) => {
    const embed = await openHostPage(page, SECURE_HOST, '/embed/strategy-ts?theme=light')
    await expect(embed.locator('html')).toHaveAttribute('data-theme', 'light')

    await postToEmbed(page, { type: 'typika:set-files', files: { 'src/main.ts': 'injected' } })
    await postToEmbed(page, { type: 'typika:set-theme', theme: 'dark' })

    await expect(embed.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(editor(embed)).not.toContainText('injected')
  })

  test('opens the current code in Typika, in a new tab', async ({ page, context }) => {
    const embed = await openHostPage(page, SECURE_HOST, '/embed/strategy-ts')
    const link = embed.getByRole('link', { name: /Ouvrir dans Typika/ })
    await expect(link).toHaveAttribute('href', /^http:\/\/localhost:3000\/s#1\./)
    const unmodified = await link.getAttribute('href')
    await editor(embed).click()
    await page.keyboard.press('ControlOrMeta+End')
    await page.keyboard.insertText('\n// edited in the embed\n')

    await expect(link).not.toHaveAttribute('href', unmodified ?? '')
    await expect(link).toHaveAttribute('target', '_blank')

    const [opened] = await Promise.all([context.waitForEvent('page'), link.click()])

    await expect(opened.getByRole('textbox', { name: 'Éditeur' })).toContainText('// edited in the embed', {
      timeout: TIMEOUT,
    })
  })

  test('runs the tests of a Go template', async ({ page }) => {
    const embed = await openHostPage(page, SECURE_HOST, '/embed/strategy-go?run=auto')
    await expect(editor(embed)).toContainText('package main')

    await expect(embed.getByRole('button', { name: 'Tests', exact: true })).toBeEnabled()
    await runTests(embed, '12 réussis')
  })

  test('runs the tests of a Kotlin template', async ({ page }) => {
    const embed = await openHostPage(page, SECURE_HOST, '/embed/strategy-kotlin')

    await runTests(embed, '11 réussis')
  })

  test('explains why nothing runs under a page that is not served over HTTPS', async ({ page }) => {
    const embed = await openHostPage(page, INSECURE_HOST, '/embed/strategy-ts?run=auto')

    await expect(embed.getByText(/ne s’exécute que dans une page servie en HTTPS/)).toBeVisible()
    await expect(embed.getByRole('button', { name: 'Tests', exact: true })).toHaveCount(0)
    await expect(embed.getByRole('link', { name: /Ouvrir dans Typika/ })).toBeVisible()
  })
})

test('copies the embed snippet from the template page', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/templates/strategy-ts')

  await page.getByRole('button', { name: /Copier le snippet d’embed/ }).click()

  await expect(page.getByRole('region', { name: 'Embed' }).getByRole('status')).toHaveText('Snippet copié')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    '<iframe src="http://localhost:3000/embed/strategy-ts"'
  )
})
