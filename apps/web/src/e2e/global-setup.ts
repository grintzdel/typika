import { chromium, type FullConfig } from '@playwright/test'

const WARM_UP_PAGES = ['/', '/templates', '/play/strategy-ts', '/compare/strategy-ts?a=typescript&b=go']

export default async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch()
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:3000'
  const page = await browser.newPage()
  for (const path of WARM_UP_PAGES)
    await page.goto(new URL(path, baseURL).href, { waitUntil: 'networkidle', timeout: 120_000 })
  await browser.close()
}
