import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from '../../../../ui/Dialog.tsx'
import type { ShareLink } from '../../core/domain/share-link.domain-model.ts'
import { GistShareSection, type GistShareSectionProps } from './GistShareSection.tsx'

export type ShareDialogProps = {
  readonly link: ShareLink | undefined
  readonly isCopied: boolean
  readonly onOpen: () => void
  readonly onCopy: (url: string) => void
  readonly gist?: Omit<GistShareSectionProps, 'onCopy'> | undefined
  readonly defaultOpen?: boolean
}

export const ShareDialog = ({ link, isCopied, onOpen, onCopy, gist, defaultOpen = false }: ShareDialogProps) => {
  const { t, i18n } = useTranslation('project')
  const format = new Intl.NumberFormat(i18n.language)
  const hasOpened = useRef(false)
  useEffect(() => {
    // Base UI does not report a dialog that mounts open.
    if (defaultOpen && !hasOpened.current) onOpen()
    hasOpened.current = true
  }, [defaultOpen, onOpen])
  return (
    <Dialog
      defaultOpen={defaultOpen}
      onOpenChange={(isOpen) => {
        if (isOpen) onOpen()
      }}
    >
      <DialogTrigger render={<Button />}>{t('share.trigger')}</DialogTrigger>
      <DialogPopup>
        <DialogTitle>{t('share.title')}</DialogTitle>
        {link === undefined ? <p className="text-base">{t('share.creating')}</p> : null}
        {link?._tag === 'TooLong' ? (
          <DialogDescription>
            {t('share.tooLong', { length: format.format(link.length), max: format.format(link.max) })}{' '}
            {gist === undefined ? null : t('share.useGist')}
          </DialogDescription>
        ) : null}
        {link?._tag === 'Ready' ? (
          <>
            <DialogDescription>{t('share.description')}</DialogDescription>
            <div className="flex gap-2">
              <input
                readOnly
                aria-label={t('share.linkLabel')}
                value={link.url}
                onFocus={(event) => event.target.select()}
                className="min-w-0 flex-1 min-h-control-sm rounded-md border border-border-strong bg-surface-raised px-3 font-mono text-sm"
              />
              <Button variant="primary" onClick={() => onCopy(link.url)}>
                {t('share.copy')}
              </Button>
            </div>
          </>
        ) : null}
        {gist === undefined ? null : <GistShareSection {...gist} onCopy={onCopy} />}
        <p role="status" className="text-base text-fg-muted">
          {isCopied ? t('share.copied') : ''}
        </p>
        <div className="flex justify-end">
          <DialogClose render={<Button />}>{t('share.close')}</DialogClose>
        </div>
      </DialogPopup>
    </Dialog>
  )
}
