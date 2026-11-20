import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

import { FAKE_GITHUB_URL } from '../../e2e/fixtures/fake-github.fixture.ts'

const editor = (page: Page) => page.getByRole('textbox', { name: 'Éditeur' })
const status = (page: Page) => page.getByRole('status', { name: 'État du projet' })
const exportDialog = (page: Page) => page.getByRole('dialog', { name: 'Exporter le projet' })
const pushSection = (page: Page) => exportDialog(page).getByRole('region', { name: 'Dépôt GitHub' })
const nameField = (page: Page) => pushSection(page).getByRole('textbox', { name: 'Nom du dépôt' })
const gistSection = (page: Page) =>
  page.getByRole('dialog', { name: 'Partager le projet' }).getByRole('region', { name: 'Gist GitHub' })

const uniqueName = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`

const pushedFiles = async (request: APIRequestContext, name: string): Promise<Record<string, string>> => {
  const body: unknown = await (await request.get(`${FAKE_GITHUB_URL}/api/repos/e2e-user/${name}/files`)).json()
  return Object.fromEntries(
    Object.entries(typeof body === 'object' && body !== null ? body : {}).map(([path, content]) => [
      path,
      typeof content === 'string' ? content : '',
    ])
  )
}

test.describe('push to a new GitHub repository', () => {
  test('creates a repository whose typika.toml keeps the template as parent', async ({ page, request }) => {
    const name = uniqueName('strategy-remix')
    await page.goto('/play/strategy-ts')
    await page.getByRole('treeitem', { name: /standard\.ts/ }).click()
    await editor(page).click()
    await page.keyboard.insertText('// push edit\n')
    await expect(status(page)).toHaveText('Modifié')

    await page.getByRole('button', { name: 'Exporter' }).click()
    await expect(pushSection(page)).toContainText('tous vos dépôts publics')
    await pushSection(page).getByRole('button', { name: 'Se connecter à GitHub' }).click()
    await expect(nameField(page)).toHaveValue('strategy-ts')
    await expect(page).toHaveURL('/play/strategy-ts')
    await nameField(page).fill(name)
    await pushSection(page).getByRole('button', { name: 'Créer le dépôt' }).click()

    await expect(pushSection(page).getByRole('link', { name: `e2e-user/${name}` })).toBeVisible()
    await expect(pushSection(page).getByRole('status')).toContainText('proposer au registre')
    const files = await pushedFiles(request, name)
    expect(files['typika.toml']).toMatch(/^parent = "github:typika-app\/templates\/strategy\/ts"$/m)
    expect(Object.values(files).some((content) => content.includes('// push edit'))).toBe(true)
    expect(Object.keys(files).some((path) => path.startsWith('tour/'))).toBe(true)
    expect(files['README.md']).not.toBe(`# ${name}\n`)

    await pushSection(page).getByRole('button', { name: 'Créer le dépôt' }).click()
    await expect(pushSection(page).getByRole('alert')).toContainText('GitHub a refusé ce nom')
    await expect(nameField(page)).toHaveValue(name)
  })

  test('pushes without the Typika files when asked', async ({ page, request }) => {
    const name = uniqueName('strategy-plain')
    await page.goto('/play/strategy-ts')
    await page.getByRole('button', { name: 'Exporter' }).click()
    await pushSection(page).getByRole('button', { name: 'Se connecter à GitHub' }).click()
    await nameField(page).fill(name)
    await pushSection(page)
      .getByRole('checkbox', { name: /Inclure les fichiers Typika/ })
      .uncheck()
    await pushSection(page).getByRole('button', { name: 'Créer le dépôt' }).click()
    await expect(pushSection(page).getByRole('link', { name: `e2e-user/${name}` })).toBeVisible()

    const paths = Object.keys(await pushedFiles(request, name))
    expect(paths.filter((path) => path === 'typika.toml' || path.startsWith('tour/'))).toEqual([])
    expect(paths).toContain('package.json')
  })

  test('asks a session that can only create gists for one more right, and keeps gists', async ({ page }) => {
    await page.goto('/play/strategy-ts')
    await page.getByRole('button', { name: 'Partager' }).click()
    await gistSection(page).getByRole('button', { name: 'Se connecter à GitHub' }).click()
    await expect(gistSection(page).getByRole('button', { name: 'Créer le gist' })).toBeVisible()
    await page.getByRole('dialog', { name: 'Partager le projet' }).getByRole('button', { name: 'Fermer' }).click()

    await page.getByRole('button', { name: 'Exporter' }).click()
    await expect(nameField(page)).toHaveCount(0)
    await pushSection(page).getByRole('button', { name: 'Se connecter à GitHub' }).click()
    await expect(nameField(page)).toBeVisible()

    expect(await page.evaluate(() => sessionStorage.getItem('typika:github:session'))).toContain('"gist","public_repo"')
  })
})
