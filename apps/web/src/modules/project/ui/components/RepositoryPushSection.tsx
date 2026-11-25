import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'
import { isRepositoryName, type PushedRepository } from '../../core/domain/repository-push.domain-model.ts'

export type RepositoryPushFailure =
  | 'required'
  | 'unauthorized'
  | 'rate-limited'
  | 'name-taken'
  | 'incomplete'
  | 'unavailable'

export type RepositoryPushInput = {
  readonly name: string
  readonly description: string
  readonly includeTypikaFiles: boolean
}

export type RepositoryPushSectionProps = {
  readonly defaultName: string
  readonly isConnected: boolean
  readonly isPushing: boolean
  readonly repository: PushedRepository | undefined
  readonly failure: RepositoryPushFailure | undefined
  readonly revokeUrl: string | undefined
  readonly onConnect: () => void
  readonly onPush: (input: RepositoryPushInput) => void
}

const FIELD =
  'w-full min-h-control-sm rounded-md border border-border-strong bg-surface-raised px-3 text-base aria-invalid:border-danger-text'

export const RepositoryPushSection = ({
  defaultName,
  isConnected,
  isPushing,
  repository,
  failure,
  revokeUrl,
  onConnect,
  onPush,
}: RepositoryPushSectionProps) => {
  const { t } = useTranslation('project')
  const [name, setName] = useState(defaultName)
  const [description, setDescription] = useState('')
  const [includeTypikaFiles, setIncludeTypikaFiles] = useState(true)
  const isValid = isRepositoryName(name)
  return (
    <section aria-label={t('repository.label')} className="space-y-2 border-t border-border pt-3">
      <h3 className="text-base font-semibold">{t('repository.label')}</h3>
      {isConnected ? (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (isValid) onPush({ name, description, includeTypikaFiles })
          }}
        >
          <p className="text-base text-fg-muted">{t('repository.description')}</p>
          <label className="block space-y-1 text-base">
            <span>{t('repository.name')}</span>
            <input
              value={name}
              aria-invalid={!isValid}
              aria-describedby="repository-name-rule"
              onChange={(event) => setName(event.target.value)}
              className={FIELD}
            />
          </label>
          <p id="repository-name-rule" className="text-sm text-fg-muted">
            {t('repository.nameRule')}
          </p>
          <label className="block space-y-1 text-base">
            <span>{t('repository.descriptionField')}</span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} className={FIELD} />
          </label>
          <label className="flex items-center gap-2 text-base">
            <input
              type="checkbox"
              checked={includeTypikaFiles}
              onChange={(event) => setIncludeTypikaFiles(event.target.checked)}
            />
            {t('repository.includeTypikaFiles')}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" variant="primary" disabled={isPushing || !isValid}>
              {isPushing ? t('repository.pushing') : t('repository.push')}
            </Button>
            {revokeUrl === undefined ? null : (
              <a
                href={revokeUrl}
                target="_blank"
                rel="noreferrer"
                className="text-base text-link underline underline-offset-2 hover:text-link-hover"
              >
                {t('gist.revoke')}
              </a>
            )}
          </div>
        </form>
      ) : (
        <>
          <p className="text-base text-fg-muted">{t('repository.connectDescription')}</p>
          <Button onClick={onConnect}>{t('gist.connect')}</Button>
        </>
      )}
      {failure === undefined ? null : (
        <p role="alert" className="text-base text-danger-text">
          {t(`repository.failed.${failure}`)}
        </p>
      )}
      {repository === undefined ? null : (
        <p role="status" className="text-base">
          {t('repository.pushed')}{' '}
          <a
            href={repository.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="text-link underline underline-offset-2 hover:text-link-hover"
          >
            {repository.fullName}
          </a>
          . {t('repository.propose')}
        </p>
      )}
    </section>
  )
}
