import { RegistryProvider } from '@effect/atom-react'
import { useEffect, useState, type ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'

import { i18n, initI18n } from '../../../i18n/i18n.ts'
import { browserStorage, preferredLanguage } from '../../../i18n/language-preference.ts'

if (!i18n.isInitialized) void initI18n('en')

const setDocumentLanguage = (language: string) => {
  document.documentElement.lang = language
}

export const AppProviders = ({ children }: { readonly children: ReactNode }) => {
  // The prerendered pages are in English. Switching instances through state, not the shared one, lets React hydrate
  // the pending Suspense boundaries in English before it renders them in the chosen language.
  const [instance, setInstance] = useState(i18n)
  useEffect(() => {
    const clone = i18n.cloneInstance({ lng: preferredLanguage(browserStorage, navigator.languages) })
    setDocumentLanguage(clone.language)
    clone.on('languageChanged', setDocumentLanguage)
    setInstance(clone)
    return () => clone.off('languageChanged', setDocumentLanguage)
  }, [])
  return (
    <I18nextProvider i18n={instance}>
      <RegistryProvider>{children}</RegistryProvider>
    </I18nextProvider>
  )
}
