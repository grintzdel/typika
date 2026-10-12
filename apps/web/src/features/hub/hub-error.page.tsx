import { HubHeader } from '../../modules/hub/ui/components/HubHeader.tsx'
import { HubIndexError } from '../../modules/hub/ui/components/HubIndexError.tsx'
import { useHubIndexFailure } from '../../modules/hub/ui/hooks/use-hub-index-failure.ts'

export const HubErrorPage = ({ error }: { readonly error: unknown }) => {
  const { failure, handleRetry } = useHubIndexFailure(error)
  return (
    <>
      <HubHeader />
      <HubIndexError failure={failure} onRetry={handleRetry} />
    </>
  )
}
