import { RegistryProvider } from '@effect/atom-react'
import { useEffect, useState, type ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'

import { detectLanguage, i18n, initI18n } from '../../../i18n/i18n.ts'

if (!i18n.isInitialized) void initI18n('en')

export const AppProviders = ({ children }: { readonly children: ReactNode }) => {
  // The prerendered pages are in English. Switching instances through state, not the shared one, lets React hydrate
  // the pending Suspense boundaries in English before it renders them in the browser language.
  const [instance, setInstance] = useState(i18n)
  useEffect(() => {
    const language = detectLanguage(navigator.languages)
    document.documentElement.lang = language
    if (language !== i18n.language) setInstance(i18n.cloneInstance({ lng: language }))
  }, [])
  return (
    <I18nextProvider i18n={instance}>
      <RegistryProvider>{children}</RegistryProvider>
    </I18nextProvider>
  )
}
