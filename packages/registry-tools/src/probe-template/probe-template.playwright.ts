import * as Effect from 'effect/Effect'
import type { Browser, Locator, Page } from 'playwright'

import { CheckResult } from '../domain/constants/health-status.constant.ts'
import type { IndexTemplate } from '../domain/registry-index.domain-model.ts'
import type { ProbeResult, ProbeTemplate } from '../run-health/run-health.ts'

export const BOOT_WARNING_MS = 20_000
export const STEP_TIMEOUT_MS = 60_000

const EXITED = /^Exited with code (-?\d+)$/
const PROGRESS = /^(\d+) \/ (\d+) target tests green$/

class ProbeError extends Error {}

const waitFor = async (locator: Locator, what: string) => {
  try {
    await locator.waitFor({ timeout: STEP_TIMEOUT_MS })
  } catch {
    throw new ProbeError(`${what} did not show within ${STEP_TIMEOUT_MS / 1000} s`)
  }
}

const open = async (page: Page, url: string) => {
  await page.goto(url)
  const tree = page.getByRole('tree', { name: 'Files' })
  const loadFailed = page.getByRole('heading', { name: 'Cannot open this template' })
  await waitFor(tree.or(loadFailed), 'the file tree')
  if (await loadFailed.isVisible())
    throw new ProbeError((await loadFailed.locator('..').textContent()) ?? 'the app cannot open the template')
  const ready = page.getByRole('button', { name: 'Tests', exact: true }).and(page.locator(':enabled'))
  const bootFailed = page.getByText(/^The runtime could not start/)
  await waitFor(ready.or(bootFailed), 'the runtime')
  if (await bootFailed.isVisible()) throw new ProbeError((await bootFailed.textContent()) ?? 'the runtime failed')
}

const runEntry = async (page: Page) => {
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  const exited = page.getByRole('region', { name: 'Console' }).getByText(EXITED)
  await waitFor(exited, 'the end of the run')
  const code = EXITED.exec((await exited.textContent()) ?? '')?.[1]
  if (code !== '0') throw new ProbeError(`the entry exited with code ${code ?? '?'}`)
}

const runTests = async (page: Page) => {
  await page.getByRole('button', { name: 'Tests', exact: true }).click()
  const status = page
    .getByRole('region', { name: 'Test results' })
    .getByRole('status')
    .filter({ hasText: /\d+ passed/ })
    .filter({ hasNotText: 'Running tests…' })
  await waitFor(status, 'the test results')
  return (await status.locator('span').allInnerTexts()).map((text) => text.trim())
}

const expectGreen = (summary: ReadonlyArray<string>) => {
  const [passed = '', failed = '', ...rest] = summary
  if (!/^[1-9]\d* passed$/.test(passed) || failed !== '0 failed' || rest.length > 0)
    throw new ProbeError(summary.join(', '))
}

const replayExercise = async (page: Page, appUrl: string, template: IndexTemplate, exercise: string) => {
  await open(page, `${appUrl}/play/${template.name}?exercise=${encodeURIComponent(exercise)}`)
  const panel = page.getByRole('region', { name: 'Exercise' })
  await runTests(page)
  const progress = PROGRESS.exec((await panel.getByText(PROGRESS).textContent()) ?? '')
  if (progress === null || Number(progress[1]) >= Number(progress[2]))
    throw new ProbeError(`${exercise}: the target tests pass before the exercise is solved`)
  await panel.getByRole('button', { name: 'Apply the solution' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Apply the solution' }).click()
  await page.getByRole('button', { name: 'Tests', exact: true }).click()
  try {
    await waitFor(panel.getByText('Exercise solved!'), `${exercise}: the solved exercise`)
  } catch (error) {
    throw new ProbeError(
      `${String(error instanceof Error ? error.message : error)} (${await panel.getByText(PROGRESS).textContent()})`
    )
  }
}

const step = async (notes: Array<string>, name: string, run: () => Promise<void>) => {
  try {
    await run()
    return CheckResult.PASS
  } catch (error) {
    notes.push(`${name}: ${error instanceof Error ? error.message : String(error)}`)
    return CheckResult.FAIL
  }
}

const probe = async (browser: Browser, appUrl: string, template: IndexTemplate): Promise<ProbeResult> => {
  const context = await browser.newContext({ locale: 'en-US' })
  const notes: Array<string> = []
  try {
    const page = await context.newPage()
    const startedAt = Date.now()
    const boot = await step(notes, 'boot', async () => {
      await open(page, `${appUrl}/play/${template.name}`)
      await runEntry(page)
    })
    if (boot === CheckResult.FAIL)
      return { checks: { boot, tests: CheckResult.SKIP, exercises: CheckResult.SKIP }, notes }
    const slow = Date.now() - startedAt > BOOT_WARNING_MS
    if (slow) notes.push(`boot: over ${BOOT_WARNING_MS / 1000} s`)
    const tests = await step(notes, 'tests', async () => expectGreen(await runTests(page)))
    const exercises = await step(notes, 'exercises', async () => {
      await template.manifest.exercises.reduce(
        (previous, exercise) => previous.then(() => replayExercise(page, appUrl, template, exercise.name)),
        Promise.resolve()
      )
    })
    return { checks: { boot: slow ? CheckResult.WARN : CheckResult.PASS, tests, exercises }, notes }
  } finally {
    await context.close()
  }
}

export const makePlaywrightProbe =
  (browser: Browser, appUrl: string): ProbeTemplate =>
  (template) =>
    Effect.promise(() => probe(browser, appUrl.replace(/\/$/, ''), template))
