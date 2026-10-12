import { useTranslation } from 'react-i18next'

import { Tab, Tabs, TabsList } from '../../../../ui/Tabs.tsx'

export const ComparePanel = { A: 'a', B: 'b', TOUR: 'tour' } as const

export type ComparePanel = (typeof ComparePanel)[keyof typeof ComparePanel]

export type PanelSwitcherProps = {
  readonly shown: ComparePanel
  readonly names: { readonly a: string; readonly b: string }
  readonly onShow: (panel: ComparePanel) => void
}

const isPanel = (value: unknown): value is ComparePanel =>
  (Object.values(ComparePanel) as ReadonlyArray<unknown>).includes(value)

export const PanelSwitcher = ({ shown, names, onShow }: PanelSwitcherProps) => {
  const { t } = useTranslation(['compare', 'tour'])
  return (
    <Tabs value={shown} onValueChange={(value) => isPanel(value) && onShow(value)} className="md:hidden">
      <TabsList aria-label={t('shown')}>
        <Tab value={ComparePanel.A}>{names.a}</Tab>
        <Tab value={ComparePanel.B}>{names.b}</Tab>
        <Tab value={ComparePanel.TOUR}>{t('tour:tab')}</Tab>
      </TabsList>
    </Tabs>
  )
}
