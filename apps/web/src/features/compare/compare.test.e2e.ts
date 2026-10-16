import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

const GO_MANIFEST = join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  'templates',
  'strategy',
  'go',
  'typika.toml'
)

type ColumnStep = { readonly tab: string; readonly firstLine?: string }

type ComparedStep = {
  readonly title: string
  readonly typescript: ColumnStep
  readonly go: ColumnStep
}

const OVERVIEW = { typescript: { tab: 'main.ts' }, go: { tab: 'main.go' } }

const CHOICE = {
  typescript: { tab: 'checkout.ts', firstLine: 'const shippingCosts: Record<ShippingOption, ShippingCost> = {' },
  go: { tab: 'checkout.go', firstLine: 'var shippingCosts = map[ShippingOption]ShippingCost{' },
}

const STEPS: ReadonlyArray<ComparedStep> = [
  { title: 'Two ways to ship, two ways to price', ...OVERVIEW },
  { title: 'One method, every rule', ...OVERVIEW },
  {
    title: 'One interface, many prices',
    typescript: { tab: 'shipping-cost.ts', firstLine: 'export interface ShippingCost {' },
    go: { tab: 'shipping_cost.go', firstLine: 'type ShippingCost func(order shop.Order) shop.Money' },
  },
  {
    title: 'The context delegates',
    typescript: { tab: 'shipping-quote.ts', firstLine: 'export class ShippingQuote {' },
    go: { tab: 'quote.go', firstLine: 'func QuoteWith(shippingCost ShippingCost, order shop.Order) Quote {' },
  },
  { title: 'Choosing a strategy', ...CHOICE },
  { title: 'When not to use it', ...CHOICE },
]

const column = (page: Page, language: string) => page.getByRole('region', { name: language, exact: true })
const tour = (page: Page) => page.getByRole('region', { name: 'Visite guidée' })

const expectColumn = async (page: Page, language: string, expected: ColumnStep) => {
  const side = column(page, language)
  await expect(
    side.getByRole('tablist', { name: 'Fichiers ouverts' }).getByRole('tab', { name: expected.tab })
  ).toHaveAttribute('aria-selected', 'true')
  const highlighted = side.getByRole('textbox', { name: `Éditeur ${language}` }).locator('.cm-typika-tour-line')
  if (expected.firstLine === undefined) await expect(highlighted).toHaveCount(0)
  else await expect(highlighted.first()).toHaveText(expected.firstLine)
}

const expectStep = async (page: Page, index: number) => {
  const step = STEPS[index]
  if (step === undefined) throw new Error(`No step ${index}`)
  await expect(tour(page).getByText(`Étape ${index + 1} / ${STEPS.length}`)).toBeVisible()
  await expect(tour(page).getByRole('heading', { name: step.title, level: 2 })).toBeVisible()
  await expect(tour(page).getByRole('heading', { name: 'TypeScript', level: 3 })).toBeVisible()
  await expect(tour(page).getByRole('heading', { name: 'Go', level: 3 })).toBeVisible()
  await expectColumn(page, 'TypeScript', step.typescript)
  await expectColumn(page, 'Go', step.go)
}

const pressNext = async (page: Page, index: number) => {
  await page.keyboard.press('Alt+ArrowRight')
  await expectStep(page, index)
}

const open = async (page: Page, path: string) => {
  await page.goto(path)
  await expect(tour(page)).toBeVisible({ timeout: 30_000 })
}

test.describe('compare', () => {
  test('walks Strategy in TypeScript and Go step by step', async ({ page }) => {
    await open(page, '/compare/strategy-ts?a=typescript&b=go')

    await expect(column(page, 'TypeScript').getByRole('textbox', { name: 'Éditeur TypeScript' })).toHaveAttribute(
      'aria-readonly',
      'true'
    )
    await expect(column(page, 'Go').getByRole('textbox', { name: 'Éditeur Go' })).toHaveAttribute(
      'aria-readonly',
      'true'
    )
    await tour(page)
      .getByRole('heading', { name: STEPS[0]?.title ?? '' })
      .click()

    await expectStep(page, 0)
    await pressNext(page, 1)
    await pressNext(page, 2)
    await pressNext(page, 3)
    await pressNext(page, 4)
    await pressNext(page, 5)

    await expect(tour(page).getByRole('button', { name: 'Étape suivante' })).toBeDisabled()
    await page.keyboard.press('Alt+ArrowLeft')
    await expect(page).toHaveURL(/#step=choosing-at-runtime$/)
  })

  test('greys the column of a variant that has no equivalent step', async ({ page }) => {
    const manifest = await readFile(GO_MANIFEST, 'utf8')
    await page.route('**/templates/strategy/go/typika.toml?*', (route) =>
      route.fulfill({
        contentType: 'text/javascript',
        body: `export default ${JSON.stringify(manifest.replace('  "tour/03-strategy-interface.md",\n', ''))}`,
      })
    )

    await open(page, '/compare/strategy-ts?a=typescript&b=go#step=strategy-interface')

    await expect(column(page, 'Go').getByText('Cette étape n’a pas d’équivalent en Go.')).toBeVisible()
    await expect(tour(page).getByText('Cette étape n’a pas d’équivalent en Go.')).toBeVisible()
    await expectColumn(page, 'TypeScript', {
      tab: 'shipping-cost.ts',
      firstLine: 'export interface ShippingCost {',
    })

    await page.keyboard.press('Alt+ArrowRight')
    await expect(column(page, 'Go').getByText('Cette étape n’a pas d’équivalent en Go.')).toBeHidden()
    await expectColumn(page, 'Go', {
      tab: 'quote.go',
      firstLine: 'func QuoteWith(shippingCost ShippingCost, order shop.Order) Quote {',
    })
  })

  test('puts TypeScript on the left and the first other variant on the right by default', async ({ page }) => {
    await open(page, '/compare/strategy-go')

    const columns = page.getByRole('region', { name: /^(TypeScript|Go|Kotlin)$/ })
    await expect(columns.nth(0)).toHaveAccessibleName('TypeScript')
    await expect(columns.nth(1)).toHaveAccessibleName('Go')
    await expect(column(page, 'TypeScript').getByRole('link', { name: 'Ouvrir dans la sandbox' })).toHaveAttribute(
      'href',
      '/play/strategy-ts'
    )
    await expect(column(page, 'Go').getByRole('link', { name: 'Ouvrir dans la sandbox' })).toHaveAttribute(
      'href',
      '/play/strategy-go'
    )
  })

  test('asks for another language when one is unknown', async ({ page }) => {
    await page.goto('/compare/strategy-ts?a=typescript&b=cobol')

    await expect(page.getByText('Le langage « cobol » n’est pas disponible pour ce template.')).toBeVisible()
    await page.getByRole('combobox', { name: 'Colonne de droite' }).selectOption('Go')

    await expect(page).toHaveURL(/\/compare\/strategy-ts\?a=typescript&b=go/)
    await expect(column(page, 'Go')).toBeVisible()
  })

  test('shows one panel at a time on a narrow screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/compare/strategy-ts?a=typescript&b=go')

    const switcher = page.getByRole('tablist', { name: 'Panneau affiché' })
    await expect(column(page, 'TypeScript')).toBeVisible()
    await expect(column(page, 'Go')).toBeHidden()
    await expect(tour(page)).toBeHidden()

    await switcher.getByRole('tab', { name: 'Go' }).click()
    await expect(column(page, 'Go')).toBeVisible()
    await expect(column(page, 'TypeScript')).toBeHidden()

    await switcher.getByRole('tab', { name: 'Visite' }).click()
    await tour(page).getByRole('button', { name: 'Étape suivante' }).click()
    await switcher.getByRole('tab', { name: 'Go' }).click()
    await expect(column(page, 'Go')).toBeVisible()
    await expect(page).toHaveURL(/#step=the-problem$/)
  })

  test('is reached from the template page', async ({ page }) => {
    await page.goto('/templates/strategy-ts')

    await page.getByRole('link', { name: 'Comparer avec Go' }).click()

    await expect(page).toHaveURL(/\/compare\/strategy-ts\?a=typescript&b=go$/)
    await expect(column(page, 'Go')).toBeVisible()
  })
})
