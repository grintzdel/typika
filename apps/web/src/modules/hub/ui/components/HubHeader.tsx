import { useTranslation } from 'react-i18next'

export const HubHeader = () => {
  const { t } = useTranslation('hub')
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <nav aria-label={t('nav.label')} className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <a href="/" className="font-semibold tracking-tight">
          {t('brand')}
        </a>
        <a href="/templates" className="text-sm text-neutral-600 hover:text-sky-700 dark:text-neutral-400">
          {t('nav.templates')}
        </a>
      </nav>
    </header>
  )
}
