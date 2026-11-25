import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Tab, Tabs, TabsList, TabsPanel } from '../../../../ui/Tabs.tsx'
import type { ConsoleState } from '../../core/domain/console.domain-model.ts'
import type { TestRunState } from '../../core/domain/test-run.domain-model.ts'
import { ConsolePanel } from './ConsolePanel.tsx'
import { TestsPanel } from './TestsPanel.tsx'

export type OutputPanel = 'console' | 'tests' | 'references'

const PANELS: ReadonlyArray<OutputPanel> = ['console', 'tests', 'references']

export type OutputPanelsProps = {
  readonly active: OutputPanel
  readonly onActiveChange: (panel: OutputPanel) => void
  readonly console: ConsoleState | undefined
  readonly testRun: TestRunState | undefined
  readonly references?: { readonly count: number | undefined; readonly content: ReactNode } | undefined
}

export const OutputPanels = ({ active, onActiveChange, console, testRun, references }: OutputPanelsProps) => {
  const { t } = useTranslation('runtime')
  return (
    <Tabs
      value={active}
      onValueChange={(value) => onActiveChange(PANELS.find((panel) => panel === value) ?? 'console')}
      className="flex min-h-0 flex-1 flex-col"
    >
      <TabsList>
        <Tab value="console">{t('panels.console')}</Tab>
        <Tab value="tests">
          {t('panels.tests')}
          {testRun === undefined ? null : (
            <span className="ml-1.5 text-sm text-fg-subtle">
              {testRun.counts.passed} ✓ {testRun.counts.failed} ✕
            </span>
          )}
        </Tab>
        {references === undefined ? null : (
          <Tab value="references">
            {t('panels.references')}
            {references.count === undefined ? null : (
              <span className="ml-1.5 text-sm text-fg-subtle">{references.count}</span>
            )}
          </Tab>
        )}
      </TabsList>
      <TabsPanel value="console">
        <ConsolePanel console={console} />
      </TabsPanel>
      <TabsPanel value="tests">
        <TestsPanel run={testRun} />
      </TabsPanel>
      {references === undefined ? null : <TabsPanel value="references">{references.content}</TabsPanel>}
    </Tabs>
  )
}
