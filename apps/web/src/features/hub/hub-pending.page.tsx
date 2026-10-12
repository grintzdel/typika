import { HubHeader } from '../../modules/hub/ui/components/HubHeader.tsx'
import { HubSkeleton } from '../../modules/hub/ui/components/HubSkeleton.tsx'

export const HubPendingPage = () => (
  <>
    <HubHeader />
    <main className="mx-auto max-w-6xl px-4">
      <HubSkeleton />
    </main>
  </>
)
