import { useState } from 'react'
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

export type ExportDialogProps = {
  readonly onExport: (includeTypikaFiles: boolean) => void
}

export const ExportDialog = ({ onExport }: ExportDialogProps) => {
  const { t } = useTranslation('project')
  const [includeTypikaFiles, setIncludeTypikaFiles] = useState(true)
  return (
    <Dialog>
      <DialogTrigger render={<Button />}>{t('export.trigger')}</DialogTrigger>
      <DialogPopup>
        <DialogTitle>{t('export.title')}</DialogTitle>
        <DialogDescription>{t('export.description')}</DialogDescription>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeTypikaFiles}
            onChange={(event) => setIncludeTypikaFiles(event.target.checked)}
          />
          {t('export.includeTypikaFiles')}
        </label>
        <div className="flex justify-end gap-2">
          <DialogClose render={<Button />}>{t('export.cancel')}</DialogClose>
          <DialogClose render={<Button variant="primary" />} onClick={() => onExport(includeTypikaFiles)}>
            {t('export.download')}
          </DialogClose>
        </div>
      </DialogPopup>
    </Dialog>
  )
}
