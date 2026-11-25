import { ContextMenu as BaseContextMenu } from '@base-ui/react/context-menu'
import type { ComponentProps, ReactElement } from 'react'

export type ContextMenuItem = {
  readonly label: string
  readonly disabled?: boolean
  readonly onSelect: () => void
}

export type ContextMenuProps = {
  readonly items: ReadonlyArray<ContextMenuItem>
  readonly trigger: ReactElement
  readonly finalFocus?: ComponentProps<typeof BaseContextMenu.Popup>['finalFocus']
  readonly onOpenChange?: (open: boolean) => void
}

export const ContextMenu = ({ items, trigger, finalFocus, onOpenChange }: ContextMenuProps) => (
  <BaseContextMenu.Root onOpenChange={(open) => onOpenChange?.(open)}>
    <BaseContextMenu.Trigger render={trigger} />
    <BaseContextMenu.Portal>
      <BaseContextMenu.Positioner className="z-50 outline-none">
        <BaseContextMenu.Popup
          finalFocus={finalFocus}
          className="flex min-w-48 flex-col rounded-md border border-border bg-surface-raised py-1 text-compact text-fg shadow-md outline-none"
        >
          {items.map((item) => (
            <BaseContextMenu.Item
              key={item.label}
              disabled={item.disabled}
              onClick={item.onSelect}
              className="flex min-h-target cursor-pointer items-center px-3 outline-none select-none data-disabled:cursor-not-allowed data-disabled:text-fg-disabled data-highlighted:bg-selected-bg data-highlighted:text-selected-fg"
            >
              {item.label}
            </BaseContextMenu.Item>
          ))}
        </BaseContextMenu.Popup>
      </BaseContextMenu.Positioner>
    </BaseContextMenu.Portal>
  </BaseContextMenu.Root>
)
