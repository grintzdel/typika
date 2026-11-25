import { useTranslation } from 'react-i18next'

import { ErrorState } from '../../../../ui/ErrorState.tsx'

export type TemplateNotFoundProps = {
  readonly name: string
}

export const TemplateNotFound = ({ name }: TemplateNotFoundProps) => {
  const { t } = useTranslation('hub')
  return (
    <ErrorState title={t('template.notFound', { name })}>
      <a href="/templates" className="text-base text-link underline underline-offset-2 hover:text-link-hover">
        {t('template.allTemplates')}
      </a>
    </ErrorState>
  )
}
