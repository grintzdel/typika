import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog'
import type { ComponentProps } from 'react'

export const AlertDialog = BaseAlertDialog.Root
export const AlertDialogTrigger = BaseAlertDialog.Trigger
export const AlertDialogClose = BaseAlertDialog.Close

export const AlertDialogPopup = ({ children }: Pick<ComponentProps<typeof BaseAlertDialog.Popup>, 'children'>) => (
  <BaseAlertDialog.Portal>
    <BaseAlertDialog.Backdrop className="fixed inset-0 z-50 bg-backdrop" />
    <BaseAlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 flex w-[min(var(--container-alert-dialog),calc(100vw-2rem))] -translate-1/2 flex-col gap-3 rounded-lg border border-border bg-surface-raised p-6 text-fg shadow-xl">
      {children}
    </BaseAlertDialog.Popup>
  </BaseAlertDialog.Portal>
)

export const AlertDialogTitle = (props: Omit<ComponentProps<typeof BaseAlertDialog.Title>, 'className'>) => (
  <BaseAlertDialog.Title className="text-xl font-bold" {...props} />
)

export const AlertDialogDescription = (
  props: Omit<ComponentProps<typeof BaseAlertDialog.Description>, 'className'>
) => <BaseAlertDialog.Description className="text-fg-muted" {...props} />
