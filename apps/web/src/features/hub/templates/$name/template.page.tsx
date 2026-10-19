import { useLanguageMenu } from '../../../../modules/app/ui/hooks/use-language-menu.ts'
import { EmbedSnippet } from '../../../../modules/embed/ui/components/EmbedSnippet.tsx'
import { useEmbedSnippet } from '../../../../modules/embed/ui/hooks/use-embed-snippet.ts'
import { templatePageWithout } from '../../../../modules/hub/core/domain/hidden-languages.domain-model.ts'
import type { TemplatePage } from '../../../../modules/hub/core/domain/hub.domain-model.ts'
import { HealthBanner } from '../../../../modules/hub/ui/components/HealthBanner.tsx'
import { HubHeader } from '../../../../modules/hub/ui/components/HubHeader.tsx'
import { TemplateDetails } from '../../../../modules/hub/ui/components/TemplateDetails.tsx'
import { TemplateNotFound } from '../../../../modules/hub/ui/components/TemplateNotFound.tsx'
import { TemplateOverview } from '../../../../modules/hub/ui/components/TemplateOverview.tsx'
import { useHiddenLanguages } from '../../../../modules/hub/ui/hooks/use-hidden-languages.ts'
import { useSearchShortcut } from '../../../../modules/hub/ui/hooks/use-search-shortcut.ts'

export const TemplateDetailPage = ({ page: indexed }: { readonly page: TemplatePage }) => {
  const languageMenu = useLanguageMenu()
  const searchRef = useSearchShortcut()
  const page = templatePageWithout(indexed, useHiddenLanguages())
  const snippet = useEmbedSnippet(page.name, page.title)
  return (
    <>
      <HubHeader languageMenu={languageMenu} searchRef={searchRef} />
      <HealthBanner health={page.health} alternatives={page.alternatives} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <TemplateOverview page={page} />
        <TemplateDetails
          page={page}
          embed={<EmbedSnippet name={page.name} isCopied={snippet.isCopied} onCopy={snippet.handleCopy} />}
        />
      </main>
    </>
  )
}

export const TemplateNotFoundPage = ({ name }: { readonly name: string }) => {
  const languageMenu = useLanguageMenu()
  const searchRef = useSearchShortcut()
  return (
    <>
      <HubHeader languageMenu={languageMenu} searchRef={searchRef} />
      <TemplateNotFound name={name} />
    </>
  )
}
