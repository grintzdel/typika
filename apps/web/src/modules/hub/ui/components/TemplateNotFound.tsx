import { useTranslation } from 'react-i18next'

import { ErrorState } from '../../../../ui/ErrorState.tsx'

export type TemplateNotFoundProps = {
  readonly name: string
}

export const TemplateNotFound = ({ name }: TemplateNotFoundProps) => {
  const { t } = useTranslation('hub')
  return (
    <ErrorState title={t('template.notFound', { name })}>
      <a href="/templates" className="text-sm text-sky-700 hover:underline">
        {t('template.allTemplates')}
      </a>
    </ErrorState>
  )
}
