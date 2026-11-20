import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'
import type { GistLink } from '../../core/domain/gist-share.domain-model.ts'

export type GistShareFailure = 'required' | 'unauthorized' | 'rate-limited' | 'unavailable'

export type GistShareSectionProps = {
  readonly isConnected: boolean
  readonly isSharing: boolean
  readonly link: GistLink | undefined
  readonly failure: GistShareFailure | undefined
  readonly revokeUrl: string | undefined
  readonly onConnect: () => void
  readonly onShare: (isPublic: boolean) => void
  readonly onSignOut: () => void
  readonly onCopy: (url: string) => void
}

export const GistShareSection = ({
  isConnected,
  isSharing,
  link,
  failure,
  revokeUrl,
  onConnect,
  onShare,
  onSignOut,
  onCopy,
}: GistShareSectionProps) => {
  const { t } = useTranslation('project')
  const [isPublic, setPublic] = useState(false)
  return (
    <section
      aria-label={t('gist.label')}
      className="space-y-2 border-t border-neutral-200 pt-3 dark:border-neutral-800"
    >
      <h3 className="text-sm font-semibold">{t('gist.label')}</h3>
      {isConnected ? (
        <>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('gist.description')}</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPublic} onChange={(event) => setPublic(event.target.checked)} />
            {t('gist.public')}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" disabled={isSharing} onClick={() => onShare(isPublic)}>
              {isSharing ? t('gist.sharing') : link === undefined ? t('gist.create') : t('gist.update')}
            </Button>
            <Button onClick={onSignOut}>{t('gist.signOut')}</Button>
            {revokeUrl === undefined ? null : (
              <a href={revokeUrl} target="_blank" rel="noreferrer" className="text-sm text-sky-700 hover:underline">
                {t('gist.revoke')}
              </a>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('gist.connectDescription')}</p>
          <Button onClick={onConnect}>{t('gist.connect')}</Button>
        </>
      )}
      {failure === undefined ? null : (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {t(`gist.failed.${failure}`)}
        </p>
      )}
      {link === undefined ? null : (
        <div className="flex flex-wrap items-center gap-2">
          <input
            readOnly
            aria-label={t('gist.linkLabel')}
            value={link.url}
            onFocus={(event) => event.target.select()}
            className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-2 py-1 font-mono text-xs dark:border-neutral-700"
          />
          <Button onClick={() => onCopy(link.url)}>{t('gist.copy')}</Button>
          <a href={link.htmlUrl} target="_blank" rel="noreferrer" className="text-sm text-sky-700 hover:underline">
            {t('gist.view')}
          </a>
        </div>
      )}
    </section>
  )
}
