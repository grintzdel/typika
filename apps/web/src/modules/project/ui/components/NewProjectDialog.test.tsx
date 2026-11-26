import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NewProjectDialog, type NewProjectDialogProps } from './NewProjectDialog.tsx'

const TEMPLATES = [
  { name: 'observer-ts', title: 'Observer: stock alerts', language: 'typescript' as const },
  { name: 'strategy-go', title: 'Strategy: pricing', language: 'go' as const },
  { name: 'strategy-ts', title: 'Strategy: pricing', language: 'typescript' as const },
]

const renderDialog = (props: Partial<NewProjectDialogProps> = {}) => {
  const handlers = {
    onOpenChange: vi.fn(),
    onCreateBlank: vi.fn(),
    onCopyTemplate: vi.fn(),
    onImportUrl: vi.fn(),
    onImportFile: vi.fn(),
    onTabChange: vi.fn(),
  }
  render(
    <NewProjectDialog
      isOpen
      initialTemplate={undefined}
      templates={TEMPLATES}
      isCreating={false}
      failure={undefined}
      {...handlers}
      {...props}
    />
  )
  return { ...handlers, dialog: screen.getByRole('dialog', { name: 'Nouveau projet' }) }
}

describe('NewProjectDialog', () => {
  it('creates a blank project in the chosen language', () => {
    const { dialog, onCreateBlank } = renderDialog()

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Nom du projet' }), {
      target: { value: 'My sandbox' },
    })
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Go' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Créer le projet' }))

    expect(onCreateBlank).toHaveBeenCalledWith({ name: 'My sandbox', language: 'go' })
  })

  it('offers every language a runtime can run, TypeScript first', () => {
    const { dialog } = renderDialog()

    const languages = within(within(dialog).getByRole('radiogroup', { name: 'Langage' })).getAllByRole('radio')
    expect(languages.map((radio) => radio.getAttribute('value'))).toEqual(['typescript', 'javascript', 'go', 'kotlin'])
    expect(within(dialog).getByRole<HTMLInputElement>('radio', { name: 'TypeScript' }).checked).toBe(true)
  })

  it('does not create a project without a name', () => {
    const { dialog, onCreateBlank } = renderDialog()

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Nom du projet' }), { target: { value: '  ' } })

    expect(within(dialog).getByRole<HTMLButtonElement>('button', { name: 'Créer le projet' }).disabled).toBe(true)
    expect(onCreateBlank).not.toHaveBeenCalled()
  })

  it('copies a template of the library, named after it unless renamed', () => {
    const { dialog, onCopyTemplate } = renderDialog()

    fireEvent.click(within(dialog).getByRole('tab', { name: 'Bibliothèque' }))
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Strategy: pricing · Go' }))
    expect(within(dialog).getByRole<HTMLInputElement>('textbox', { name: 'Nom du projet' }).value).toBe(
      'Strategy: pricing'
    )
    fireEvent.click(within(dialog).getByRole('button', { name: 'Créer le projet' }))

    expect(onCopyTemplate).toHaveBeenCalledWith({ template: 'strategy-go', name: 'Strategy: pricing' })
  })

  it('narrows the library to the templates that match the search', () => {
    const { dialog } = renderDialog()
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Bibliothèque' }))

    fireEvent.change(within(dialog).getByRole('searchbox', { name: 'Rechercher un template' }), {
      target: { value: 'observ' },
    })

    expect(
      within(dialog)
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('value'))
    ).toEqual(['observer-ts'])
  })

  it('says when no template matches the search', () => {
    const { dialog } = renderDialog()
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Bibliothèque' }))

    fireEvent.change(within(dialog).getByRole('searchbox', { name: 'Rechercher un template' }), {
      target: { value: 'visitor' },
    })

    expect(within(dialog).getByText('Aucun template ne correspond à « visitor ».')).toBeDefined()
  })

  it('opens on the library with a template already chosen', () => {
    const { dialog } = renderDialog({ initialTemplate: 'strategy-ts' })

    expect(within(dialog).getByRole('tab', { name: 'Bibliothèque' }).getAttribute('aria-selected')).toBe('true')
    expect(
      within(dialog).getByRole<HTMLInputElement>('radio', { name: 'Strategy: pricing · TypeScript' }).checked
    ).toBe(true)
    expect(within(dialog).getByRole<HTMLInputElement>('textbox', { name: 'Nom du projet' }).value).toBe(
      'Strategy: pricing'
    )
  })

  it('chooses the asked template once the catalogue arrives', () => {
    const handlers = {
      onOpenChange: vi.fn(),
      onCreateBlank: vi.fn(),
      onCopyTemplate: vi.fn(),
      onImportUrl: vi.fn(),
      onImportFile: vi.fn(),
      onTabChange: vi.fn(),
    }
    const props = { isOpen: true, initialTemplate: 'strategy-ts', isCreating: false, failure: undefined, ...handlers }
    const { rerender } = render(<NewProjectDialog {...props} templates={[]} />)

    rerender(<NewProjectDialog {...props} templates={TEMPLATES} />)

    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Strategy: pricing · TypeScript' }).checked).toBe(true)
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Nom du projet' }).value).toBe('Strategy: pricing')
  })

  it('waits while the project is being created', () => {
    const { dialog } = renderDialog({ isCreating: true })

    expect(within(dialog).getByRole<HTMLButtonElement>('button', { name: 'Création…' }).disabled).toBe(true)
  })

  it('says when the project could not be created', () => {
    const { dialog } = renderDialog({ failure: { _tag: 'Storage' } })

    expect(within(dialog).getByRole('alert').textContent).toBe('Le projet n’a pas pu être créé. Réessayez.')
  })

  it('imports a template from its address', () => {
    const { dialog, onImportUrl } = renderDialog()
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Depuis une URL' }))

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Adresse du template' }), {
      target: { value: ' github:octocat/patterns/strategy/ts ' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Créer le projet' }))

    expect(onImportUrl).toHaveBeenCalledWith('github:octocat/patterns/strategy/ts')
  })

  it('imports a typika.toml or a zip file', () => {
    const { dialog, onImportFile } = renderDialog()
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Importer un fichier' }))
    const file = new File(['schema = 1'], 'typika.toml')

    fireEvent.change(within(dialog).getByLabelText('Fichier typika.toml ou zip'), { target: { files: [file] } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Créer le projet' }))

    expect(onImportFile).toHaveBeenCalledWith(file)
  })

  it('lists the issues of an invalid manifest', () => {
    const { dialog } = renderDialog({
      failure: {
        _tag: 'Invalid',
        issues: [{ path: 'facets.level', message: 'Expected "beginner" | "intermediate" | "advanced"' }],
      },
    })

    const alert = within(dialog).getByRole('alert')
    expect(alert.textContent).toContain('Le typika.toml n’est pas valide')
    expect(within(alert).getByRole('listitem').textContent).toBe(
      'facets.level: Expected "beginner" | "intermediate" | "advanced"'
    )
  })

  it('tells when GitHub limits the requests', () => {
    const { dialog } = renderDialog({ failure: { _tag: 'Unavailable', reason: 'rate-limited' } })

    expect(within(dialog).getByRole('alert').textContent).toContain('GitHub limite les requêtes anonymes')
  })
})
