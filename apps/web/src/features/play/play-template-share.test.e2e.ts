import { expect, test, type Browser, type Page } from '@playwright/test'

const editor = (page: Page) => page.getByRole('textbox', { name: 'Éditeur' })
const status = (page: Page) => page.getByRole('status', { name: 'État du projet' })
const shareBanner = (page: Page) => page.getByRole('region', { name: 'Projet partagé' })

const editStandardShipping = async (page: Page) => {
  await page.goto('/play/strategy-ts')
  await page.getByRole('treeitem', { name: /standard\.ts/ }).click()
  await editor(page).click()
  await page.keyboard.insertText('// shared edit\n')
  await expect(status(page)).toHaveText('Modifié')
}

const shareLinkOf = async (page: Page) => {
  await page.getByRole('button', { name: 'Partager' }).click()
  const dialog = page.getByRole('dialog', { name: 'Partager le projet' })
  const link = dialog.getByRole('textbox', { name: 'Lien de partage' })
  await expect(link).toHaveValue(/\/s#1\./)
  return link.inputValue()
}

const openInFreshContext = async (browser: Browser, url: string) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(url)
  return page
}

test.describe('share by URL', () => {
  test('opens a shared project in another browser with the same files, without saving it', async ({
    page,
    browser,
  }) => {
    await editStandardShipping(page)
    const url = await shareLinkOf(page)

    const other = await openInFreshContext(browser, url)
    await expect(shareBanner(other)).toContainText('Strategy')
    await expect(shareBanner(other).getByRole('link')).toHaveAttribute('href', '/templates/strategy-ts')
    await expect(other.getByRole('treeitem', { name: 'standard.ts, modifié' })).toBeVisible()
    await other.getByRole('treeitem', { name: /standard\.ts/ }).click()
    await expect(editor(other)).toContainText('// shared edit')

    await other.goto('/projects')
    await expect(other.getByText(/restent dans ce navigateur/)).toBeVisible()
    await other.context().close()
  })

  test('saves a shared project in my projects on request', async ({ page, browser }) => {
    await editStandardShipping(page)
    const url = await shareLinkOf(page)

    const other = await openInFreshContext(browser, url)
    await shareBanner(other).getByRole('button', { name: 'Enregistrer dans mes projets' }).click()
    await expect(shareBanner(other)).toContainText('Enregistré dans vos projets')

    await other.goto('/projects')
    await expect(other.getByRole('list', { name: 'Projets' }).getByRole('link', { name: 'strategy-ts' })).toBeVisible()
    await other.context().close()
  })

  test('saves a shared project on its first edit, and reopens the saved copy from the link', async ({
    page,
    browser,
  }) => {
    await editStandardShipping(page)
    const url = await shareLinkOf(page)

    const other = await openInFreshContext(browser, url)
    await other.getByRole('treeitem', { name: /express\.ts/ }).click()
    await editor(other).click()
    await other.keyboard.insertText('// edit after opening\n')
    await expect(other.getByRole('treeitem', { name: 'express.ts, modifié' })).toBeVisible()
    await expect(shareBanner(other)).toContainText('Enregistré dans vos projets')

    await other.goto('about:blank')
    await other.goto(url)
    await other.getByRole('treeitem', { name: /express\.ts/ }).click()
    await expect(editor(other)).toContainText('// edit after opening')
    await other.context().close()
  })

  test('offers no link for a project too large for a URL', async ({ page }) => {
    await page.goto('/play/strategy-ts')
    await page.getByRole('treeitem', { name: /standard\.ts/ }).click()
    await editor(page).click()
    const noise = Array.from({ length: 2_500 }, (_, index) => ((index * 2_654_435_761) >>> 0).toString(36)).join('')
    await page.keyboard.insertText(`// ${noise}\n`)
    await expect(status(page)).toHaveText('Modifié')

    await page.getByRole('button', { name: 'Partager' }).click()
    const dialog = page.getByRole('dialog', { name: 'Partager le projet' })
    await expect(dialog).toContainText('trop volumineux')
    await expect(dialog.getByRole('textbox', { name: 'Lien de partage' })).toHaveCount(0)
  })

  test('explains an invalid link', async ({ page }) => {
    await page.goto('/s#1.not-a-payload')

    await expect(page.getByText('Ce lien de partage est invalide.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Retour aux templates' })).toHaveAttribute('href', '/templates')
  })

  test('explains a link made by a newer version of Typika', async ({ page }) => {
    await page.goto('/s#9.abc')

    await expect(page.getByText(/créé avec une version plus récente de Typika/)).toBeVisible()
  })
})
