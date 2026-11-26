import type { Language } from '@typika/manifest'
import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'
import { Dialog, DialogClose, DialogDescription, DialogPopup, DialogTitle } from '../../../../ui/Dialog.tsx'
import { Tab, Tabs, TabsList, TabsPanel } from '../../../../ui/Tabs.tsx'
import { languageNameOf } from '../../../shared/core/domain/language-name.domain-model.ts'
import { PERSONAL_LANGUAGES } from '../../core/domain/personal-project.domain-model.ts'

export type NewProjectTemplate = { readonly name: string; readonly title: string; readonly language: Language }

export type NewProjectFailure =
  | { readonly _tag: 'Storage' }
  | { readonly _tag: 'Url' }
  | { readonly _tag: 'Unavailable'; readonly reason: 'not-found' | 'rate-limited' | 'too-large' | 'unavailable' }
  | { readonly _tag: 'Archive'; readonly reason: 'archive' | 'too-large' }
  | { readonly _tag: 'ManifestMissing' }
  | { readonly _tag: 'Invalid'; readonly issues: ReadonlyArray<{ readonly path: string; readonly message: string }> }

export type NewProjectDialogProps = {
  readonly isOpen: boolean
  readonly initialTemplate: string | undefined
  readonly templates: ReadonlyArray<NewProjectTemplate>
  readonly isCreating: boolean
  readonly failure: NewProjectFailure | undefined
  readonly onOpenChange: (isOpen: boolean) => void
  readonly onCreateBlank: (input: { readonly name: string; readonly language: Language }) => void
  readonly onCopyTemplate: (input: { readonly template: string; readonly name: string }) => void
  readonly onImportUrl: (url: string) => void
  readonly onImportFile: (file: File) => void
  readonly onTabChange: () => void
}

type Status = Pick<NewProjectDialogProps, 'isCreating' | 'failure'>

const FIELD = 'w-full min-h-control-sm rounded-md border border-border-strong bg-surface-raised px-3 text-base'
const OPTION =
  'flex min-h-target cursor-pointer items-center gap-2 rounded-md px-2 hover:bg-surface-muted has-checked:bg-selected-bg has-checked:text-selected-fg'

const FailureMessage = ({ failure }: { readonly failure: NewProjectFailure }) => {
  const { t } = useTranslation('project')
  return (
    <div role="alert" className="space-y-1 text-base text-danger-text">
      {failure._tag === 'Storage' ? <p>{t('create.failed')}</p> : null}
      {failure._tag === 'Url' ? <p>{t('create.failures.url')}</p> : null}
      {failure._tag === 'Unavailable' ? <p>{t(`create.failures.${failure.reason}`)}</p> : null}
      {failure._tag === 'Archive' ? (
        <p>{t(failure.reason === 'archive' ? 'create.failures.archive' : 'create.failures.archiveTooLarge')}</p>
      ) : null}
      {failure._tag === 'ManifestMissing' ? <p>{t('create.failures.manifestMissing')}</p> : null}
      {failure._tag === 'Invalid' ? (
        <>
          <p>{t('create.failures.invalid')}</p>
          <ul lang="en" className="list-disc space-y-1 pl-5 font-mono text-compact">
            {failure.issues.map((issue) => (
              <li key={`${issue.path}:${issue.message}`}>
                {issue.path === '' ? issue.message : `${issue.path}: ${issue.message}`}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}

type FormProps = Status & {
  readonly name?: string
  readonly onName?: (name: string) => void
  readonly canSubmit: boolean
  readonly onSubmit: () => void
  readonly children: ReactNode
}

const CreateForm = ({ name, onName, canSubmit, isCreating, failure, onSubmit, children }: FormProps) => {
  const { t } = useTranslation('project')
  const isValid = canSubmit && name?.trim() !== ''
  return (
    <form
      className="space-y-4 pt-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (isValid && !isCreating) onSubmit()
      }}
    >
      {children}
      {name === undefined ? null : (
        <label className="block space-y-1">
          <span className="text-base font-semibold">{t('create.name')}</span>
          <input value={name} onChange={(event) => onName?.(event.target.value)} className={FIELD} />
        </label>
      )}
      {failure === undefined ? null : <FailureMessage failure={failure} />}
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
}: Status & {
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
}: Status &
  Pick<NewProjectDialogProps, 'templates' | 'initialTemplate'> & {
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

const UrlForm = ({ onImport, ...status }: Status & { readonly onImport: NewProjectDialogProps['onImportUrl'] }) => {
  const { t } = useTranslation('project')
  const hintId = useId()
  const [url, setUrl] = useState('')
  return (
    <CreateForm {...status} canSubmit={url.trim() !== ''} onSubmit={() => onImport(url.trim())}>
      <label className="block space-y-1">
        <span className="text-base font-semibold">{t('create.url')}</span>
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          aria-describedby={hintId}
          spellCheck={false}
          autoComplete="off"
          placeholder="github:owner/repo/path"
          className={FIELD}
        />
      </label>
      <p id={hintId} className="text-base text-fg-muted">
        {t('create.urlHint')}
      </p>
    </CreateForm>
  )
}

const FileForm = ({ onImport, ...status }: Status & { readonly onImport: NewProjectDialogProps['onImportFile'] }) => {
  const { t } = useTranslation('project')
  const hintId = useId()
  const [file, setFile] = useState<File>()
  return (
    <CreateForm
      {...status}
      canSubmit={file !== undefined}
      onSubmit={() => {
        if (file !== undefined) onImport(file)
      }}
    >
      <label className="block space-y-1">
        <span className="text-base font-semibold">{t('create.file')}</span>
        <input
          type="file"
          accept=".toml,.zip"
          aria-describedby={hintId}
          onChange={(event) => setFile(event.target.files?.[0])}
          className="block w-full text-base file:mr-3 file:min-h-control-sm file:rounded-md file:border file:border-border-strong file:bg-surface-raised file:px-4 file:font-semibold file:text-fg"
        />
      </label>
      <p id={hintId} className="text-base text-fg-muted">
        {t('create.fileHint')}
      </p>
    </CreateForm>
  )
}

export const NewProjectDialog = ({
  isOpen,
  initialTemplate,
  templates,
  isCreating,
  failure,
  onOpenChange,
  onCreateBlank,
  onCopyTemplate,
  onImportUrl,
  onImportFile,
  onTabChange,
}: NewProjectDialogProps) => {
  const { t } = useTranslation('project')
  const status = { isCreating, failure }
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogPopup>
        <DialogTitle>{t('create.title')}</DialogTitle>
        <DialogDescription>{t('create.description')}</DialogDescription>
        <Tabs defaultValue={initialTemplate === undefined ? 'blank' : 'library'} onValueChange={onTabChange}>
          <TabsList aria-label={t('create.tabs.label')} className="px-0">
            <Tab value="blank">{t('create.tabs.blank')}</Tab>
            <Tab value="library">{t('create.tabs.library')}</Tab>
            <Tab value="url">{t('create.tabs.url')}</Tab>
            <Tab value="file">{t('create.tabs.file')}</Tab>
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
          <TabsPanel value="url">
            <UrlForm {...status} onImport={onImportUrl} />
          </TabsPanel>
          <TabsPanel value="file">
            <FileForm {...status} onImport={onImportFile} />
          </TabsPanel>
        </Tabs>
      </DialogPopup>
    </Dialog>
  )
}
