import { expect, test } from '@playwright/test'

import {
  hostMessages,
  openHostPage,
  SECURE_HOST,
  serveHostPages,
  WITHOUT_LOCAL_NETWORK_CHECKS,
} from '../fixtures/embed-host.fixture.ts'
import { APP_URL } from './production-urls.ts'

test.use(WITHOUT_LOCAL_NETWORK_CHECKS)

test('runs the tests of a template embedded in a page of another site', async ({ page, context }) => {
  await serveHostPages(context, APP_URL)
  const embed = await openHostPage(page, SECURE_HOST, '/embed/strategy-ts')

  await embed.getByRole('button', { name: 'Tests', exact: true }).click()

  await expect(embed.getByRole('region', { name: 'Résultats des tests' }).getByText('11 réussis')).toBeVisible({
    timeout: 60_000,
  })
  await expect
    .poll(() => hostMessages(page))
    .toContainEqual({
      origin: new URL(APP_URL).origin,
      data: { type: 'typika:test-result', passed: 11, failed: 0 },
    })
})
