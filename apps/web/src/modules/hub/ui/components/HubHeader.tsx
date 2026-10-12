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
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <nav aria-label={t('nav.label')} className="flex items-center gap-6">
          <a href="/" className="font-semibold tracking-tight">
            {t('brand')}
          </a>
          <a href="/templates" className="text-sm text-neutral-600 hover:text-sky-700 dark:text-neutral-400">
            {t('nav.templates')}
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
            className="w-full rounded-md border border-neutral-300 bg-transparent py-1 pr-7 pl-2 text-sm dark:border-neutral-700"
            {...(search === undefined
              ? {}
              : { value: search.text, onChange: (event) => search.onSearch(event.target.value) })}
          />
          <kbd
            aria-hidden="true"
            className="absolute top-1/2 right-2 -translate-y-1/2 text-xs text-neutral-500 dark:text-neutral-400"
          >
            /
          </kbd>
        </form>
        <LanguageMenu {...languageMenu} />
      </div>
    </header>
  )
}
