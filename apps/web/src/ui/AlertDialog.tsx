import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog'
import type { ComponentProps } from 'react'

export const AlertDialog = BaseAlertDialog.Root
export const AlertDialogTrigger = BaseAlertDialog.Trigger
export const AlertDialogClose = BaseAlertDialog.Close

export const AlertDialogPopup = ({ children }: Pick<ComponentProps<typeof BaseAlertDialog.Popup>, 'children'>) => (
  <BaseAlertDialog.Portal>
    <BaseAlertDialog.Backdrop className="fixed inset-0 bg-black/40" />
    <BaseAlertDialog.Popup className="fixed top-1/2 left-1/2 w-[min(28rem,calc(100vw-2rem))] -translate-1/2 space-y-3 rounded-lg border border-neutral-200 bg-white p-5 text-neutral-900 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
      {children}
    </BaseAlertDialog.Popup>
  </BaseAlertDialog.Portal>
)

export const AlertDialogTitle = (props: Omit<ComponentProps<typeof BaseAlertDialog.Title>, 'className'>) => (
  <BaseAlertDialog.Title className="text-base font-semibold" {...props} />
)

export const AlertDialogDescription = (
  props: Omit<ComponentProps<typeof BaseAlertDialog.Description>, 'className'>
) => <BaseAlertDialog.Description className="text-sm text-neutral-600 dark:text-neutral-400" {...props} />
