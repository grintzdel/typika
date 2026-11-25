import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import type { ComponentProps } from 'react'

export const Dialog = BaseDialog.Root
export const DialogTrigger = BaseDialog.Trigger
export const DialogClose = BaseDialog.Close

export const DialogPopup = ({ children }: Pick<ComponentProps<typeof BaseDialog.Popup>, 'children'>) => (
  <BaseDialog.Portal>
    <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-backdrop" />
    <BaseDialog.Popup className="fixed top-1/2 left-1/2 z-50 flex w-[min(var(--container-dialog),calc(100vw-2rem))] -translate-1/2 flex-col gap-3 rounded-lg border border-border bg-surface-raised p-6 text-fg shadow-xl">
      {children}
    </BaseDialog.Popup>
  </BaseDialog.Portal>
)

export const DialogTitle = (props: Omit<ComponentProps<typeof BaseDialog.Title>, 'className'>) => (
  <BaseDialog.Title className="text-xl font-bold" {...props} />
)

export const DialogDescription = (props: Omit<ComponentProps<typeof BaseDialog.Description>, 'className'>) => (
  <BaseDialog.Description className="text-fg-muted" {...props} />
)
