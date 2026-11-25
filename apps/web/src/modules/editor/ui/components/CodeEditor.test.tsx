import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider, useTranslation } from 'react-i18next'
import { describe, expect, it } from 'vitest'

import { i18n } from '../../../../i18n/i18n.ts'
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
})
