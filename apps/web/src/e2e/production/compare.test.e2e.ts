import { expect, test, type Page } from '@playwright/test'

import { APP_URL } from './production-urls.ts'

const expectHighlight = (page: Page, language: string, line: string) =>
  expect(
    page
      .getByRole('region', { name: language, exact: true })
      .getByRole('textbox', { name: `Éditeur ${language}` })
      .locator('.cm-typika-tour-line')
      .first()
  ).toHaveText(line)

test('compares two variants read from the registry under the production policies', async ({ page }) => {
  const violations: Array<string> = []
  page.on('console', (message) => {
    if (/Content Security Policy|Cross-Origin|Embedder/i.test(message.text())) violations.push(message.text())
  })

  await page.goto(`${APP_URL}/compare/strategy-ts?a=typescript&b=go#step=context`)

  await expectHighlight(page, 'TypeScript', 'export class ShippingQuote {')
  await expectHighlight(page, 'Go', 'func QuoteWith(shippingCost ShippingCost, order shop.Order) Quote {')
  expect(violations).toEqual([])
})
