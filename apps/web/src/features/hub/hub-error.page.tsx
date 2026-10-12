import { useLanguageMenu } from '../../modules/app/ui/hooks/use-language-menu.ts'
import { HubHeader } from '../../modules/hub/ui/components/HubHeader.tsx'
import { HubIndexError } from '../../modules/hub/ui/components/HubIndexError.tsx'
import { useHubIndexFailure } from '../../modules/hub/ui/hooks/use-hub-index-failure.ts'

export const HubErrorPage = ({ error }: { readonly error: unknown }) => {
  const languageMenu = useLanguageMenu()
  const { failure, handleRetry } = useHubIndexFailure(error)
  return (
    <>
      <HubHeader languageMenu={languageMenu} />
      <HubIndexError failure={failure} onRetry={handleRetry} />
    </>
  )
}
