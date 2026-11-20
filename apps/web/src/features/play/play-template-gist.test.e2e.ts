import { expect, test, type Browser, type Page } from '@playwright/test'

const editor = (page: Page) => page.getByRole('textbox', { name: 'Éditeur' })
const status = (page: Page) => page.getByRole('status', { name: 'État du projet' })
const shareBanner = (page: Page) => page.getByRole('region', { name: 'Projet partagé' })
const shareDialog = (page: Page) => page.getByRole('dialog', { name: 'Partager le projet' })
const gistSection = (page: Page) => shareDialog(page).getByRole('region', { name: 'Gist GitHub' })
const gistLink = (page: Page) => gistSection(page).getByRole('textbox', { name: 'Lien du gist' })

const editStandardShipping = async (page: Page, line: string) => {
  await page.getByRole('treeitem', { name: /standard\.ts/ }).click()
  await editor(page).click()
  await page.keyboard.insertText(`${line}\n`)
  await expect(status(page)).toHaveText('Modifié')
}

const signInFromShareDialog = async (page: Page) => {
  await page.getByRole('button', { name: 'Partager' }).click()
  await gistSection(page).getByRole('button', { name: 'Se connecter à GitHub' }).click()
  await expect(gistSection(page).getByRole('button', { name: 'Créer le gist' })).toBeVisible()
}

const openInFreshContext = async (browser: Browser, url: string) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(url)
  return page
}

test.describe('share by gist', () => {
  test('creates a secret gist after signing in, and reopens it in another browser without signing in', async ({
    page,
    browser,
  }) => {
    await page.goto('/play/strategy-ts')
    await editStandardShipping(page, '// gist edit')

    await signInFromShareDialog(page)
    await expect(page).toHaveURL('/play/strategy-ts')
    await expect(gistSection(page)).toContainText('quiconque a le lien')
    await gistSection(page).getByRole('button', { name: 'Créer le gist' }).click()
    await expect(gistLink(page)).toHaveValue(/\/g\/[0-9a-f]+$/)
    const url = await gistLink(page).inputValue()

    const other = await openInFreshContext(browser, url)
    await expect(shareBanner(other)).toContainText('Strategy')
    await expect(other.getByRole('treeitem', { name: 'standard.ts, modifié' })).toBeVisible()
    await other.getByRole('treeitem', { name: /standard\.ts/ }).click()
    await expect(editor(other)).toContainText('// gist edit')

    await other.goto('/projects')
    await expect(other.getByText(/restent dans ce navigateur/)).toBeVisible()
    await other.context().close()
  })

  test('updates the same gist when a project is shared again', async ({ page, browser }) => {
    await page.goto('/play/strategy-ts')
    await editStandardShipping(page, '// first version')
    await signInFromShareDialog(page)
    await gistSection(page).getByRole('button', { name: 'Créer le gist' }).click()
    await expect(gistLink(page)).toHaveValue(/\/g\/[0-9a-f]+$/)
    const url = await gistLink(page).inputValue()
    await shareDialog(page).getByRole('button', { name: 'Fermer' }).click()

    await editStandardShipping(page, '// second version')
    await page.getByRole('button', { name: 'Partager' }).click()
    await gistSection(page).getByRole('button', { name: 'Mettre à jour le gist' }).click()
    await expect(gistSection(page).getByRole('button', { name: 'Mettre à jour le gist' })).toBeEnabled()
    await expect(gistLink(page)).toHaveValue(url)

    const other = await openInFreshContext(browser, url)
    await other.getByRole('treeitem', { name: /standard\.ts/ }).click()
    await expect(editor(other)).toContainText('// second version')
    await other.context().close()
  })

  test('signs out and forgets the session of the tab', async ({ page }) => {
    await page.goto('/play/strategy-ts')
    await signInFromShareDialog(page)
    expect(await page.evaluate(() => sessionStorage.getItem('typika:github:session'))).toContain('gho_')

    await gistSection(page).getByRole('button', { name: 'Se déconnecter' }).click()

    await expect(gistSection(page).getByRole('button', { name: 'Se connecter à GitHub' })).toBeVisible()
    expect(await page.evaluate(() => sessionStorage.getItem('typika:github:session'))).toBeNull()
  })

  test('explains that a gist does not exist', async ({ page }) => {
    await page.goto('/g/0123456789abcdef0123')

    await expect(page.getByRole('alert')).toContainText('Ce gist n’existe pas')
    await expect(page.getByRole('link', { name: 'Retour aux templates' })).toHaveAttribute('href', '/templates')
  })

  test('refuses a callback that no sign-in of this tab started', async ({ page }) => {
    await page.goto('/auth/github/callback?code=stolen&state=forged')

    await expect(page.getByRole('alert')).toContainText('n’a pas commencé dans cet onglet')
    expect(await page.evaluate(() => sessionStorage.getItem('typika:github:session'))).toBeNull()
  })
})
