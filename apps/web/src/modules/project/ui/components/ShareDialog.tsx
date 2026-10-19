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

export type ShareDialogProps = {
  readonly link: ShareLink | undefined
  readonly isCopied: boolean
  readonly onOpen: () => void
  readonly onCopy: (url: string) => void
}

export const ShareDialog = ({ link, isCopied, onOpen, onCopy }: ShareDialogProps) => {
  const { t, i18n } = useTranslation('project')
  const format = new Intl.NumberFormat(i18n.language)
  return (
    <Dialog
      onOpenChange={(isOpen) => {
        if (isOpen) onOpen()
      }}
    >
      <DialogTrigger render={<Button />}>{t('share.trigger')}</DialogTrigger>
      <DialogPopup>
        <DialogTitle>{t('share.title')}</DialogTitle>
        {link === undefined ? <p className="text-sm">{t('share.creating')}</p> : null}
        {link?._tag === 'TooLong' ? (
          <DialogDescription>
            {t('share.tooLong', { length: format.format(link.length), max: format.format(link.max) })}
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
                className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-2 py-1 font-mono text-xs dark:border-neutral-700"
              />
              <Button variant="primary" onClick={() => onCopy(link.url)}>
                {t('share.copy')}
              </Button>
            </div>
            <p role="status" className="text-sm text-neutral-600 dark:text-neutral-400">
              {isCopied ? t('share.copied') : ''}
            </p>
          </>
        ) : null}
        <div className="flex justify-end">
          <DialogClose render={<Button />}>{t('share.close')}</DialogClose>
        </div>
      </DialogPopup>
    </Dialog>
  )
}
