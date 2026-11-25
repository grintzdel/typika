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
    <section aria-label={t('gist.label')} className="space-y-2 border-t border-border pt-3">
      <h3 className="text-base font-semibold">{t('gist.label')}</h3>
      {isConnected ? (
        <>
          <p className="text-base text-fg-muted">{t('gist.description')}</p>
          <label className="flex items-center gap-2 text-base">
            <input type="checkbox" checked={isPublic} onChange={(event) => setPublic(event.target.checked)} />
            {t('gist.public')}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" disabled={isSharing} onClick={() => onShare(isPublic)}>
              {isSharing ? t('gist.sharing') : link === undefined ? t('gist.create') : t('gist.update')}
            </Button>
            <Button onClick={onSignOut}>{t('gist.signOut')}</Button>
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
        </>
      ) : (
        <>
          <p className="text-base text-fg-muted">{t('gist.connectDescription')}</p>
          <Button onClick={onConnect}>{t('gist.connect')}</Button>
        </>
      )}
      {failure === undefined ? null : (
        <p role="alert" className="text-base text-danger-text">
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
            className="min-w-0 flex-1 min-h-control-sm rounded-md border border-border-strong bg-surface-raised px-3 font-mono text-sm"
          />
          <Button onClick={() => onCopy(link.url)}>{t('gist.copy')}</Button>
          <a
            href={link.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="text-base text-link underline underline-offset-2 hover:text-link-hover"
          >
            {t('gist.view')}
          </a>
        </div>
      )}
    </section>
  )
}
