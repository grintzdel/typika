import { fileTab } from '../../../editor/core/domain/editor-tabs.domain-model.ts'
import { useEditorTabs } from '../../../editor/ui/hooks/use-editor-tabs.ts'
import { useTour } from '../../../tour/ui/hooks/use-tour.ts'
import {
  alignSteps,
  columnViewOf,
  type ColumnView,
  type ComparedStep,
  type ComparedViews,
} from '../../core/domain/compare.domain-model.ts'
import type { ComparedVariant } from '../../core/programs/open-comparison/open-comparison.program.ts'

type ColumnTabs = ReturnType<typeof useEditorTabs>

const NO_STEPS: ReadonlyArray<ComparedStep> = []

const show = (tabs: ColumnTabs, view: ColumnView) => {
  if (view._tag === 'Open') tabs.handleOpenTabs(view.files.map(fileTab), view.range)
}

export const useCompareTour = (a: ComparedVariant | undefined, b: ComparedVariant | undefined) => {
  const left = useEditorTabs(a?.entry)
  const right = useEditorTabs(b?.entry)
  const steps = a === undefined || b === undefined ? NO_STEPS : alignSteps(a.tourSteps, b.tourSteps)
  const tour = useTour({
    steps,
    anchorOf: (step): ComparedViews => ({
      a: columnViewOf(step.a, step.b, (path) => a?.files.get(path)),
      b: columnViewOf(step.b, step.a, (path) => b?.files.get(path)),
    }),
    onOpen: (_step, views) => {
      show(left, views.a)
      show(right, views.b)
    },
  })

  return {
    steps,
    tour,
    columns: {
      a: { tabs: left, view: tour.anchor?.a },
      b: { tabs: right, view: tour.anchor?.b },
    },
  }
}
