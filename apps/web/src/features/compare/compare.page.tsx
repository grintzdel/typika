import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { LanguageMenu } from '../../modules/app/ui/components/LanguageMenu.tsx'
import { useLanguageMenu } from '../../modules/app/ui/hooks/use-language-menu.ts'
import { CompareColumn } from '../../modules/compare/ui/components/CompareColumn.tsx'
import { ComparedStepText } from '../../modules/compare/ui/components/ComparedStepText.tsx'
import { ComparisonUnavailable } from '../../modules/compare/ui/components/ComparisonUnavailable.tsx'
import { ComparePanel, PanelSwitcher } from '../../modules/compare/ui/components/PanelSwitcher.tsx'
import { SidePicker } from '../../modules/compare/ui/components/SidePicker.tsx'
import { useCompareTour } from '../../modules/compare/ui/hooks/use-compare-tour.ts'
import { useComparison } from '../../modules/compare/ui/hooks/use-comparison.ts'
import { buildFileTree } from '../../modules/project/core/domain/file-tree.domain-model.ts'
import { TemplateLoadError } from '../../modules/project/ui/components/TemplateLoadError.tsx'
import { WorkbenchSkeleton } from '../../modules/project/ui/components/WorkbenchSkeleton.tsx'
import { languageNameOf } from '../../modules/shared/core/domain/language-name.domain-model.ts'
import { TourPanel } from '../../modules/tour/ui/components/TourPanel.tsx'

export type ComparePageProps = {
  readonly name: string
  readonly a: string | undefined
  readonly b: string | undefined
  readonly onChoose: (a: string | undefined, b: string | undefined) => void
}

export const ComparePage = ({ name, a, b, onChoose }: ComparePageProps) => {
  const { t } = useTranslation('compare')
  const languageMenu = useLanguageMenu()
  const { comparison, failure, embeddedTemplates, handleRetry } = useComparison(name, a, b)
  const ready = comparison?._tag === 'Ready' ? comparison : undefined
  const { steps, tour, columns } = useCompareTour(ready?.a, ready?.b)
  const [shown, setShown] = useState<ComparePanel>(ComparePanel.A)

  if (failure !== undefined) return <TemplateLoadError failure={failure} onRetry={handleRetry} />
  if (comparison === undefined) return <WorkbenchSkeleton />

  const variants = comparison.variants.map((variant) => ({
    ...variant,
    languageName: languageNameOf(variant.language),
  }))
  const header = (
    title: string,
    picked: { readonly a: string | undefined; readonly b: string | undefined }
  ): ReactNode => (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
      <h1 className="font-semibold">{t('title', { title })}</h1>
      <SidePicker variants={variants} a={picked.a} b={picked.b} onChoose={onChoose} />
      <div className="ml-auto">
        <LanguageMenu {...languageMenu} />
      </div>
    </header>
  )

  if (ready === undefined)
    return (
      <div className="flex h-dvh flex-col">
        {header(name, { a, b })}
        <main className="p-6">
          {comparison._tag === 'Choose' ? <ComparisonUnavailable choice={comparison.choice} /> : null}
        </main>
      </div>
    )

  const sides = { a: ready.a, b: ready.b }
  const names = { a: languageNameOf(ready.a.language), b: languageNameOf(ready.b.language) }

  return (
    <div className="flex h-dvh flex-col">
      {header(ready.a.title, { a: ready.a.language, b: ready.b.language })}
      <PanelSwitcher shown={shown} names={names} onShow={setShown} />
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(18rem,24rem)]">
        {(['a', 'b'] as const).map((side) => {
          const { tabs, view } = columns[side]
          const variant = sides[side]
          return (
            <CompareColumn
              key={side}
              languageName={names[side]}
              name={variant.name}
              isShown={shown === side}
              tree={buildFileTree(variant.files.keys())}
              tabs={tabs.tabs}
              activeKey={tabs.activeTab?.key}
              editorTab={tabs.editorTab}
              highlight={tabs.highlight}
              view={view}
              embeddedTemplates={embeddedTemplates}
              contentOf={(path) => variant.files.get(path) ?? ''}
              onOpenFile={tabs.handleOpenFile}
              onSelectTab={tabs.handleSelect}
              onCloseTab={tabs.handleClose}
            />
          )
        })}
        <aside className={`${shown === ComparePanel.TOUR ? 'block' : 'hidden'} min-h-0 overflow-hidden md:block`}>
          {tour.step === undefined ? null : (
            <TourPanel steps={steps} index={tour.index} announcement={tour.announcement} onSelect={tour.handleSelect}>
              <ComparedStepText
                title={tour.step.title}
                sides={[
                  { languageName: names.a, step: tour.step.a },
                  { languageName: names.b, step: tour.step.b },
                ]}
                embeddedTemplates={embeddedTemplates}
              />
            </TourPanel>
          )}
        </aside>
      </div>
    </div>
  )
}
