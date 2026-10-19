import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ProjectListItem } from '../../core/domain/project.domain-model.ts'
import { ProjectList } from './ProjectList.tsx'

const NOW = Date.UTC(2026, 9, 19, 12)

const item = (overrides: Partial<ProjectListItem> = {}): ProjectListItem => ({
  id: 'project-1',
  name: 'strategy-ts',
  path: '/p/project-1',
  templateName: 'strategy-ts',
  templateTitle: 'Strategy: pricing',
  language: 'typescript',
  exercise: undefined,
  updatedAt: NOW - 2 * 3_600_000,
  ...overrides,
})

const handlers = () => ({ onRename: vi.fn(), onDuplicate: vi.fn(), onDelete: vi.fn(), onExport: vi.fn() })

describe('ProjectList', () => {
  it('lists each project with its template, language, exercise and last change', () => {
    render(
      <ProjectList
        now={NOW}
        projects={[
          item(),
          item({
            id: 'project-2',
            name: 'observer-ts',
            path: '/p/project-2',
            exercise: 'fix-it',
            templateTitle: undefined,
            language: undefined,
            templateName: 'observer-ts',
          }),
        ]}
        {...handlers()}
      />
    )

    const [strategy, observer] = within(screen.getByRole('list', { name: 'Projets' })).getAllByRole('listitem')
    expect(within(strategy!).getByRole('link', { name: 'strategy-ts' }).getAttribute('href')).toBe('/p/project-1')
    expect(strategy?.textContent).toContain('Strategy: pricing')
    expect(strategy?.textContent).toContain('TypeScript')
    expect(strategy?.textContent).toContain('il y a 2 heures')
    expect(observer?.textContent).toContain('observer-ts')
    expect(observer?.textContent).toContain('Exercice : fix-it')
  })

  it('explains where the projects live when there are none', () => {
    render(<ProjectList now={NOW} projects={[]} {...handlers()} />)

    expect(screen.queryByRole('list', { name: 'Projets' })).toBeNull()
    expect(screen.getByText(/restent dans ce navigateur/)).toBeDefined()
    expect(screen.getByRole('link', { name: 'Parcourir les templates' }).getAttribute('href')).toBe('/templates')
  })

  it('renames a project from its row', () => {
    const props = handlers()
    render(<ProjectList now={NOW} projects={[item()]} {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Renommer' }))
    const name = screen.getByRole<HTMLInputElement>('textbox', { name: 'Nom du projet' })
    expect(name.value).toBe('strategy-ts')
    fireEvent.change(name, { target: { value: 'My pricing' } })
    fireEvent.submit(name)

    expect(props.onRename).toHaveBeenCalledWith('project-1', 'My pricing')
    expect(screen.queryByRole('textbox', { name: 'Nom du projet' })).toBeNull()
  })

  it('cancels a rename', () => {
    const props = handlers()
    render(<ProjectList now={NOW} projects={[item()]} {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Renommer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(props.onRename).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'strategy-ts' })).toBeDefined()
  })

  it('duplicates a project under a copy name', () => {
    const props = handlers()
    render(<ProjectList now={NOW} projects={[item()]} {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Dupliquer' }))

    expect(props.onDuplicate).toHaveBeenCalledWith('project-1', 'strategy-ts (copie)')
  })

  it('deletes a project only after confirmation', async () => {
    const props = handlers()
    render(<ProjectList now={NOW} projects={[item()]} {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Supprimer « strategy-ts » ?' })
    expect(props.onDelete).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Supprimer' }))

    expect(props.onDelete).toHaveBeenCalledWith('project-1')
  })

  it('exports a project from its row', async () => {
    const props = handlers()
    render(<ProjectList now={NOW} projects={[item()]} {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Exporter' }))
    const dialog = await screen.findByRole('dialog', { name: 'Exporter le projet' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Télécharger le zip' }))

    expect(props.onExport).toHaveBeenCalledWith('project-1', true)
  })
})
