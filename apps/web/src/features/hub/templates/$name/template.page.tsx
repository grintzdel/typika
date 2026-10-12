import type { TemplatePage } from '../../../../modules/hub/core/domain/hub.domain-model.ts'
import { HubHeader } from '../../../../modules/hub/ui/components/HubHeader.tsx'
import { TemplateDetails } from '../../../../modules/hub/ui/components/TemplateDetails.tsx'
import { TemplateNotFound } from '../../../../modules/hub/ui/components/TemplateNotFound.tsx'
import { TemplateOverview } from '../../../../modules/hub/ui/components/TemplateOverview.tsx'

export const TemplateDetailPage = ({ page }: { readonly page: TemplatePage }) => (
  <>
    <HubHeader />
    <main className="mx-auto max-w-6xl px-4 py-8">
      <TemplateOverview page={page} />
      <TemplateDetails page={page} />
    </main>
  </>
)

export const TemplateNotFoundPage = ({ name }: { readonly name: string }) => (
  <>
    <HubHeader />
    <TemplateNotFound name={name} />
  </>
)
