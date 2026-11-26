import type { Language } from '@typika/manifest'
import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'
import { Dialog, DialogClose, DialogDescription, DialogPopup, DialogTitle } from '../../../../ui/Dialog.tsx'
import { Tab, Tabs, TabsList, TabsPanel } from '../../../../ui/Tabs.tsx'
import { languageNameOf } from '../../../shared/core/domain/language-name.domain-model.ts'
import { PERSONAL_LANGUAGES } from '../../core/domain/personal-project.domain-model.ts'

export type NewProjectTemplate = { readonly name: string; readonly title: string; readonly language: Language }

export type NewProjectDialogProps = {
  readonly isOpen: boolean
  readonly initialTemplate: string | undefined
  readonly templates: ReadonlyArray<NewProjectTemplate>
  readonly isCreating: boolean
  readonly hasFailed: boolean
  readonly onOpenChange: (isOpen: boolean) => void
  readonly onCreateBlank: (input: { readonly name: string; readonly language: Language }) => void
  readonly onCopyTemplate: (input: { readonly template: string; readonly name: string }) => void
}

const FIELD = 'w-full min-h-control-sm rounded-md border border-border-strong bg-surface-raised px-3 text-base'
const OPTION =
  'flex min-h-target cursor-pointer items-center gap-2 rounded-md px-2 hover:bg-surface-muted has-checked:bg-selected-bg has-checked:text-selected-fg'

type FormProps = Pick<NewProjectDialogProps, 'isCreating' | 'hasFailed'> & {
  readonly name: string
  readonly onName: (name: string) => void
  readonly canSubmit: boolean
  readonly onSubmit: () => void
  readonly children: ReactNode
}

const CreateForm = ({ name, onName, canSubmit, isCreating, hasFailed, onSubmit, children }: FormProps) => {
  const { t } = useTranslation('project')
  const isValid = canSubmit && name.trim() !== ''
  return (
    <form
      className="space-y-4 pt-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (isValid && !isCreating) onSubmit()
      }}
    >
      {children}
      <label className="block space-y-1">
        <span className="text-base font-semibold">{t('create.name')}</span>
        <input value={name} onChange={(event) => onName(event.target.value)} className={FIELD} />
      </label>
      {hasFailed ? (
        <p role="alert" className="text-base text-danger-text">
          {t('create.failed')}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <DialogClose render={<Button />}>{t('create.cancel')}</DialogClose>
        <Button type="submit" variant="primary" disabled={!isValid || isCreating}>
          {isCreating ? t('create.creating') : t('create.submit')}
        </Button>
      </div>
    </form>
  )
}

const BlankForm = ({
  onCreate,
  ...status
}: Pick<NewProjectDialogProps, 'isCreating' | 'hasFailed'> & {
  readonly onCreate: NewProjectDialogProps['onCreateBlank']
}) => {
  const { t } = useTranslation('project')
  const labelId = useId()
  const [name, setName] = useState<string>(t('create.defaultName'))
  const [language, setLanguage] = useState<Language>('typescript')
  return (
    <CreateForm {...status} name={name} onName={setName} canSubmit onSubmit={() => onCreate({ name, language })}>
      <div role="radiogroup" aria-labelledby={labelId} className="space-y-1">
        <p id={labelId} className="text-base font-semibold">
          {t('create.language')}
        </p>
        <div className="grid grid-cols-2 gap-1">
          {PERSONAL_LANGUAGES.map((candidate) => (
            <label key={candidate} className={OPTION}>
              <input
                type="radio"
                name="language"
                value={candidate}
                checked={candidate === language}
                onChange={() => setLanguage(candidate)}
              />
              {languageNameOf(candidate)}
            </label>
          ))}
        </div>
      </div>
    </CreateForm>
  )
}

const LibraryForm = ({
  templates,
  initialTemplate,
  onCreate,
  ...status
}: Pick<NewProjectDialogProps, 'isCreating' | 'hasFailed' | 'templates' | 'initialTemplate'> & {
  readonly onCreate: NewProjectDialogProps['onCopyTemplate']
}) => {
  const { t } = useTranslation('project')
  const labelId = useId()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(initialTemplate)
  const [typedName, setTypedName] = useState<string>()
  const chosen = templates.find((template) => template.name === selected)
  const name = typedName ?? chosen?.title ?? ''
  const needle = query.trim().toLowerCase()
  const shown = templates.filter(
    (template) =>
      needle === '' || template.title.toLowerCase().includes(needle) || template.name.toLowerCase().includes(needle)
  )
  return (
    <CreateForm
      {...status}
      name={name}
      onName={setTypedName}
      canSubmit={chosen !== undefined}
      onSubmit={() => {
        if (chosen !== undefined) onCreate({ template: chosen.name, name })
      }}
    >
      <input
        type="search"
        aria-label={t('create.search')}
        placeholder={t('create.search')}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={FIELD}
      />
      <div role="radiogroup" aria-labelledby={labelId} className="space-y-1">
        <p id={labelId} className="text-base font-semibold">
          {t('create.templates')}
        </p>
        {shown.length === 0 ? (
          <p className="text-base text-fg-muted">{t('create.noTemplate', { query: query.trim() })}</p>
        ) : (
          <div className="max-h-64 space-y-1 overflow-auto">
            {shown.map((template) => (
              <label key={template.name} className={OPTION}>
                <input
                  type="radio"
                  name="template"
                  aria-label={`${template.title} · ${languageNameOf(template.language)}`}
                  value={template.name}
                  checked={template.name === selected}
                  onChange={() => setSelected(template.name)}
                />
                <span lang="en">{template.title}</span>
                <span className="text-fg-muted">· {languageNameOf(template.language)}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </CreateForm>
  )
}

export const NewProjectDialog = ({
  isOpen,
  initialTemplate,
  templates,
  isCreating,
  hasFailed,
  onOpenChange,
  onCreateBlank,
  onCopyTemplate,
}: NewProjectDialogProps) => {
  const { t } = useTranslation('project')
  const status = { isCreating, hasFailed }
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogPopup>
        <DialogTitle>{t('create.title')}</DialogTitle>
        <DialogDescription>{t('create.description')}</DialogDescription>
        <Tabs defaultValue={initialTemplate === undefined ? 'blank' : 'library'}>
          <TabsList aria-label={t('create.tabs.label')} className="px-0">
            <Tab value="blank">{t('create.tabs.blank')}</Tab>
            <Tab value="library">{t('create.tabs.library')}</Tab>
          </TabsList>
          <TabsPanel value="blank">
            <BlankForm {...status} onCreate={onCreateBlank} />
          </TabsPanel>
          <TabsPanel value="library">
            <LibraryForm
              {...status}
              templates={templates}
              initialTemplate={initialTemplate}
              onCreate={onCopyTemplate}
            />
          </TabsPanel>
        </Tabs>
      </DialogPopup>
    </Dialog>
  )
}
