import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import type { ComponentProps } from 'react'

export const Dialog = BaseDialog.Root
export const DialogTrigger = BaseDialog.Trigger
export const DialogClose = BaseDialog.Close

export const DialogPopup = ({ children }: Pick<ComponentProps<typeof BaseDialog.Popup>, 'children'>) => (
  <BaseDialog.Portal>
    <BaseDialog.Backdrop className="fixed inset-0 bg-black/40" />
    <BaseDialog.Popup className="fixed top-1/2 left-1/2 w-[min(32rem,calc(100vw-2rem))] -translate-1/2 space-y-3 rounded-lg border border-neutral-200 bg-white p-5 text-neutral-900 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
      {children}
    </BaseDialog.Popup>
  </BaseDialog.Portal>
)

export const DialogTitle = (props: Omit<ComponentProps<typeof BaseDialog.Title>, 'className'>) => (
  <BaseDialog.Title className="text-base font-semibold" {...props} />
)

export const DialogDescription = (props: Omit<ComponentProps<typeof BaseDialog.Description>, 'className'>) => (
  <BaseDialog.Description className="text-sm text-neutral-600 dark:text-neutral-400" {...props} />
)
