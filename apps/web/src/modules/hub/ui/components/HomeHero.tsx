import { useTranslation } from 'react-i18next'

export const HomeHero = () => {
  const { t } = useTranslation('hub')
  return (
    <div className="py-12">
      <h1 className="text-display font-bold tracking-tight">{t('hero.title')}</h1>
      <a
        href="/templates"
        className="mt-6 inline-flex min-h-control-md items-center rounded-md bg-accent px-5 text-base font-semibold text-on-accent transition-colors duration-150 hover:bg-accent-hover"
      >
        {t('hero.browse')}
      </a>
    </div>
  )
}
