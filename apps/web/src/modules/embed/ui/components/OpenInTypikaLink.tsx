import { useTranslation } from 'react-i18next'

export const OpenInTypikaLink = ({ href }: { readonly href: string }) => {
  const { t } = useTranslation('embed')
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="inline-flex min-h-control-sm shrink-0 items-center rounded-md border border-border-strong bg-surface-raised px-4 text-base font-semibold shadow-sm hover:bg-surface-muted"
    >
      {t('openInTypika')}
      <span aria-hidden="true" className="ml-1">
        ↗
      </span>
    </a>
  )
}
