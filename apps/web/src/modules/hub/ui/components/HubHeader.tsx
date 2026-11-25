import type { Ref } from 'react'
import { useTranslation } from 'react-i18next'

import { LanguageMenu, type LanguageMenuProps } from '../../../app/ui/components/LanguageMenu.tsx'

export type HubHeaderProps = {
  readonly languageMenu: LanguageMenuProps
  readonly searchRef?: Ref<HTMLInputElement>
  readonly search?: { readonly text: string; readonly onSearch: (text: string) => void }
}

export const HubHeader = ({ languageMenu, searchRef, search }: HubHeaderProps) => {
  const { t } = useTranslation('hub')
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-page items-center gap-6 px-6 py-3">
        <nav aria-label={t('nav.label')} className="flex items-center gap-6">
          <a href="/" className="text-brand font-extrabold tracking-tight">
            {t('brand')}
          </a>
          <a href="/templates" className="text-base text-fg-muted hover:text-link">
            {t('nav.templates')}
          </a>
          <a href="/projects" className="text-base text-fg-muted hover:text-link">
            {t('nav.projects')}
          </a>
        </nav>
        <form
          role="search"
          action="/templates"
          method="get"
          className="relative ml-auto w-40 sm:w-64"
          onSubmit={search === undefined ? undefined : (event) => event.preventDefault()}
        >
          <input
            ref={searchRef}
            type="search"
            name="q"
            aria-label={t('search.label')}
            aria-keyshortcuts="/"
            placeholder={t('search.placeholder')}
            className="min-h-control-sm w-full rounded-md border border-border-strong bg-surface-raised pr-8 pl-3 text-base"
            {...(search === undefined
              ? {}
              : { value: search.text, onChange: (event) => search.onSearch(event.target.value) })}
          />
          <kbd aria-hidden="true" className="absolute top-1/2 right-2 -translate-y-1/2 text-sm text-fg-subtle">
            /
          </kbd>
        </form>
        <LanguageMenu {...languageMenu} />
      </div>
    </header>
  )
}
