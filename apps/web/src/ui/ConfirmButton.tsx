import type { ReactNode } from 'react'

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './AlertDialog.tsx'
import { Button } from './Button.tsx'

export type ConfirmButtonProps = {
  readonly children: ReactNode
  readonly title: string
  readonly description: string
  readonly confirm: string
  readonly cancel: string
  readonly onConfirm: () => void
}

export const ConfirmButton = ({ children, title, description, confirm, cancel, onConfirm }: ConfirmButtonProps) => (
  <AlertDialog>
    <AlertDialogTrigger render={<Button />}>{children}</AlertDialogTrigger>
    <AlertDialogPopup>
      <AlertDialogTitle>{title}</AlertDialogTitle>
      <AlertDialogDescription>{description}</AlertDialogDescription>
      <div className="flex justify-end gap-2 pt-2">
        <AlertDialogClose render={<Button />}>{cancel}</AlertDialogClose>
        <AlertDialogClose render={<Button variant="primary" />} onClick={onConfirm}>
          {confirm}
        </AlertDialogClose>
      </div>
    </AlertDialogPopup>
  </AlertDialog>
)
