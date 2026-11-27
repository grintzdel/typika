import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as Effect from 'effect/Effect'
import { I18nextProvider, useTranslation } from 'react-i18next'
import { describe, expect, it } from 'vitest'

import { i18n } from '../../../../i18n/i18n.ts'
import type { EditorDiagnostic } from '../../core/domain/language-service.domain-model.ts'
import type { LanguageServiceSession } from '../../core/ports/language-service.port.ts'
import { CodeEditor } from './CodeEditor.tsx'

const LabelledEditor = ({ documentKey }: { readonly documentKey: string }) => {
  const { t } = useTranslation('editor')
  return (
    <CodeEditor
      documentKey={documentKey}
      path={`src/${documentKey}.ts`}
      content="export const total = 1"
      readOnly={false}
      highlight={undefined}
      diagnostics={[]}
      label={t('label')}
      languageService={undefined}
      onChange={() => undefined}
    />
  )
}

const renderInFrench = () => {
  const instance = i18n.cloneInstance({ lng: 'fr' })
  const view = render(
    <I18nextProvider i18n={instance}>
      <LabelledEditor documentKey="main" />
    </I18nextProvider>
  )
  const rerender = (documentKey: string) =>
    view.rerender(
      <I18nextProvider i18n={instance}>
        <LabelledEditor documentKey={documentKey} />
      </I18nextProvider>
    )
  return { instance, rerender }
}

const recordingSession = (updates: Array<readonly [string, string]>): LanguageServiceSession => ({
  updateFile: (path, content) => Effect.sync(() => void updates.push([path, content])),
  removeFile: () => Effect.void,
  diagnostics: () => Effect.succeed([]),
  projectDiagnostics: () => Effect.succeed([]),
  completions: () => Effect.succeed(undefined),
  completionChanges: () => Effect.succeed([]),
  completionDetails: () => Effect.succeed(undefined),
  quickInfo: () => Effect.succeed(undefined),
  signatureHelp: () => Effect.succeed(undefined),
  definition: () => Effect.succeed([]),
  references: () => Effect.succeed(undefined),
  rename: () => Effect.succeed(undefined),
})

const openSearch = () => fireEvent.keyDown(screen.getByRole('textbox'), { key: 'f', code: 'KeyF', ctrlKey: true })

describe('CodeEditor', () => {
  it('names the editor in the language chosen after it opened', async () => {
    const { instance } = renderInFrench()

    await act(() => instance.changeLanguage('en'))

    expect(screen.getByRole('textbox', { name: 'Editor' })).toBeDefined()
  })

  it('shows the find panel in the language chosen after it opened', async () => {
    const { instance } = renderInFrench()

    await act(() => instance.changeLanguage('en'))
    openSearch()

    expect(screen.getByPlaceholderText('Find')).toBeDefined()
  })

  it('translates a file opened before the language changed when it comes back', async () => {
    const { instance, rerender } = renderInFrench()
    rerender('other')

    await act(() => instance.changeLanguage('en'))
    rerender('main')

    expect(screen.getByRole('textbox', { name: 'Editor' })).toBeDefined()
  })

  it('hands a Go file to the language service when there is one', async () => {
    const updates: Array<readonly [string, string]> = []

    render(
      <CodeEditor
        documentKey="main"
        path="main.go"
        content="package main"
        readOnly={false}
        highlight={undefined}
        diagnostics={[]}
        label="Editor"
        languageService={recordingSession(updates)}
        onChange={() => undefined}
      />
    )

    await waitFor(() => expect(updates).toContainEqual(['main.go', 'package main']))
  })

  it('marks the diagnostics the language service publishes after the last edit', async () => {
    const watchers = new Set<(path: string) => void>()
    let found: ReadonlyArray<EditorDiagnostic> = []
    const session: LanguageServiceSession = {
      ...recordingSession([]),
      diagnostics: () => Effect.sync(() => found),
      watchDiagnostics: (listener) => {
        watchers.add(listener)
        return () => void watchers.delete(listener)
      },
    }
    const { container } = render(
      <CodeEditor
        documentKey="main"
        path="main.go"
        content="package main"
        readOnly={false}
        highlight={undefined}
        diagnostics={[]}
        label="Editor"
        languageService={session}
        onChange={() => undefined}
      />
    )
    await waitFor(() => expect(watchers.size).toBe(1))

    found = [{ from: 8, to: 12, severity: 'error', message: 'expected main' }]
    act(() => {
      for (const watcher of watchers) watcher('main.go')
    })

    await waitFor(() => expect(container.querySelector('.cm-lintRange-error')?.textContent).toBe('main'))
  })
})
