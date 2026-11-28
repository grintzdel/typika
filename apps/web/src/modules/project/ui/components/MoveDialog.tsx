import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'
import { Dialog, DialogClose, DialogDescription, DialogPopup, DialogTitle } from '../../../../ui/Dialog.tsx'
import { nameOf, type FileTreeMoving, type TreeItemRef } from '../../core/domain/file-operations.domain-model.ts'
import { FolderIcon } from './FileIcon.tsx'

type MoveDialogProps = {
  readonly moving: FileTreeMoving | undefined
  readonly issue: string | undefined
  readonly onMove: (item: TreeItemRef, folder: string) => void
  readonly onCancel: () => void
}

export const MoveDialog = ({ moving, issue, onMove, onCancel }: MoveDialogProps) => {
  const { t } = useTranslation('project')
  const issueId = useId()
  const [shown, setShown] = useState(moving)
  if (moving !== undefined && moving !== shown) setShown(moving)
  return (
    <Dialog
      open={moving !== undefined}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <DialogPopup>
        <DialogTitle>{t('tree.moving.title', { name: nameOf(shown?.path ?? '') })}</DialogTitle>
        <DialogDescription>
          {shown?.folders.length === 0 ? t('tree.moving.noFolder') : t('tree.moving.description')}
        </DialogDescription>
        <ul className="flex max-h-72 flex-col overflow-auto">
          {shown?.folders.map((folder) => (
            <li key={folder}>
              <button
                type="button"
                aria-describedby={issue === undefined ? undefined : issueId}
                className="flex min-h-target w-full items-center gap-2 rounded-sm px-2 text-left font-mono text-base hover:bg-surface-muted focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-focus-ring"
                onClick={() => onMove({ path: shown.path, isFolder: shown.isFolder }, folder)}
              >
                <FolderIcon isOpen={false} />
                {folder === '' ? <span className="font-sans">{t('tree.moving.root')}</span> : folder}
              </button>
            </li>
          ))}
        </ul>
        {issue === undefined ? null : (
          <p id={issueId} role="alert" className="text-sm text-danger-text">
            {issue}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <DialogClose render={<Button />}>{t('tree.moving.cancel')}</DialogClose>
        </div>
      </DialogPopup>
    </Dialog>
  )
}
