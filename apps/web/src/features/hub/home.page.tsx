import type { ConceptSection } from '../../modules/hub/core/domain/hub.domain-model.ts'
import { ConceptSections } from '../../modules/hub/ui/components/ConceptSections.tsx'
import { HomeHero } from '../../modules/hub/ui/components/HomeHero.tsx'
import { HubHeader } from '../../modules/hub/ui/components/HubHeader.tsx'
import { useSearchShortcut } from '../../modules/hub/ui/hooks/use-search-shortcut.ts'
import { RecentProjects } from '../../modules/project/ui/components/RecentProjects.tsx'
import { useRecentProjects } from '../../modules/project/ui/hooks/use-recent-projects.ts'

export type HomePageProps = {
  readonly sections: ReadonlyArray<ConceptSection>
}

export const HomePage = ({ sections }: HomePageProps) => {
  const recent = useRecentProjects()
  const searchRef = useSearchShortcut()
  return (
    <>
      <HubHeader searchRef={searchRef} />
      <main className="mx-auto max-w-6xl px-4 pb-10">
        <HomeHero />
        <ConceptSections sections={sections} />
        <RecentProjects projects={recent.projects} now={recent.now} />
      </main>
    </>
  )
}
