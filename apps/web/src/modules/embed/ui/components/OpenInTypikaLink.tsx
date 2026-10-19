import { useTranslation } from 'react-i18next'

export const OpenInTypikaLink = ({ href }: { readonly href: string }) => {
  const { t } = useTranslation('embed')
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="inline-flex h-7 shrink-0 items-center rounded-md border border-neutral-300 px-2.5 text-sm font-medium hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:border-neutral-700 dark:hover:bg-neutral-800"
    >
      {t('openInTypika')}
      <span aria-hidden="true" className="ml-1">
        ↗
      </span>
    </a>
  )
}
