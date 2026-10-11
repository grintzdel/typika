import { useTranslation } from 'react-i18next'

import { TemplateList } from '../../modules/project/ui/components/TemplateList.tsx'
import { useTemplateSummaries } from '../../modules/project/ui/hooks/use-template-summaries.ts'

export const HomePage = () => {
  const { t } = useTranslation('home')
  const { templates, isLoading } = useTemplateSummaries()
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <p className="mt-2 mb-6 text-neutral-600 dark:text-neutral-400">{t('intro')}</p>
      {isLoading ? <p role="status">{t('loading')}</p> : <TemplateList templates={templates} />}
    </main>
  )
}
