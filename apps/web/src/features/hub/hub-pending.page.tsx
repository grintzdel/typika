import { useLanguageMenu } from '../../modules/app/ui/hooks/use-language-menu.ts'
import { HubHeader } from '../../modules/hub/ui/components/HubHeader.tsx'
import { HubSkeleton } from '../../modules/hub/ui/components/HubSkeleton.tsx'

export const HubPendingPage = () => {
  const languageMenu = useLanguageMenu()
  return (
    <>
      <HubHeader languageMenu={languageMenu} />
      <main className="mx-auto max-w-6xl px-4">
        <HubSkeleton />
      </main>
    </>
  )
}
