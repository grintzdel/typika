import { useTranslation } from 'react-i18next'

export const HomeHero = () => {
  const { t } = useTranslation('hub')
  return (
    <div className="py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{t('hero.title')}</h1>
      <a
        href="/templates"
        className="mt-6 inline-flex h-9 items-center rounded-md bg-sky-700 px-3.5 text-sm font-medium text-white hover:bg-sky-800"
      >
        {t('hero.browse')}
      </a>
    </div>
  )
}
