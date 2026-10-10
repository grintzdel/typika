import { RegistryProvider } from '@effect/atom-react'
import type { ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'

import { detectLanguage, i18n, initI18n } from '../../../i18n/i18n.ts'

if (!i18n.isInitialized) void initI18n(detectLanguage(typeof navigator === 'undefined' ? [] : navigator.languages))

export const AppProviders = ({ children }: { readonly children: ReactNode }) => (
  <I18nextProvider i18n={i18n}>
    <RegistryProvider>{children}</RegistryProvider>
  </I18nextProvider>
)
