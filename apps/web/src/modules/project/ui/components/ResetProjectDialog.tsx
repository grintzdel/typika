import { useTranslation } from 'react-i18next'

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../../../ui/AlertDialog.tsx'
import { Button } from '../../../../ui/Button.tsx'

export type ResetProjectDialogProps = {
  readonly modifiedPaths: ReadonlyArray<string>
  readonly onConfirm: () => void
}

export const ResetProjectDialog = ({ modifiedPaths, onConfirm }: ResetProjectDialogProps) => {
  const { t } = useTranslation('project')
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button />} disabled={modifiedPaths.length === 0}>
        <span aria-hidden="true">⟲</span>
        {t('reset.trigger')}
      </AlertDialogTrigger>
      <AlertDialogPopup>
        <AlertDialogTitle>{t('reset.title')}</AlertDialogTitle>
        <AlertDialogDescription>{t('reset.description')}</AlertDialogDescription>
        <ul className="max-h-48 overflow-auto font-mono text-sm">
          {modifiedPaths.map((path) => (
            <li key={path}>{path}</li>
          ))}
        </ul>
        <div className="flex justify-end gap-2 pt-2">
          <AlertDialogClose render={<Button />}>{t('reset.cancel')}</AlertDialogClose>
          <AlertDialogClose render={<Button variant="primary" />} onClick={onConfirm}>
            {t('reset.confirm')}
          </AlertDialogClose>
        </div>
      </AlertDialogPopup>
    </AlertDialog>
  )
}
