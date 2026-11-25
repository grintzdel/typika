import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'

export type PanelSizes = {
  readonly sidebar: number
  readonly aside: number
  readonly bottom: number | undefined
}

export type ResizablePanel = keyof PanelSizes

export const DEFAULT_PANEL_SIZES: PanelSizes = { sidebar: 240, aside: 400, bottom: undefined }

const BOUNDS: Readonly<Record<ResizablePanel, { readonly min: number; readonly max: number }>> = {
  sidebar: { min: 160, max: 480 },
  aside: { min: 280, max: 720 },
  bottom: { min: 120, max: 720 },
}

const STEP = 16
const LARGE_STEP = 64
const DEFAULT_BOTTOM = 'minmax(11.25rem,35%)'

const GROWS: Readonly<
  Record<ResizablePanel, { readonly key: string; readonly shrinkKey: string; readonly sign: 1 | -1 }>
> = {
  sidebar: { key: 'ArrowRight', shrinkKey: 'ArrowLeft', sign: 1 },
  aside: { key: 'ArrowLeft', shrinkKey: 'ArrowRight', sign: -1 },
  bottom: { key: 'ArrowUp', shrinkKey: 'ArrowDown', sign: -1 },
}

const MIN_EDITOR_WIDTH = 320
const MIN_EDITOR_HEIGHT = 240

const coordinateOf = (panel: ResizablePanel, event: PointerEvent<HTMLDivElement>) =>
  panel === 'bottom' ? event.clientY : event.clientX

type Drag = {
  readonly panel: ResizablePanel
  readonly pointerId: number
  readonly start: number
  readonly size: number
}

type ResizeHandleProps = {
  readonly panel: ResizablePanel
  readonly label: string
  readonly size: number
  readonly isDragging: boolean
  readonly onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
  readonly onPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  readonly onPointerMove: (event: PointerEvent<HTMLDivElement>) => void
  readonly onPointerUp: (event: PointerEvent<HTMLDivElement>) => void
}

const ResizeHandle = ({ panel, label, size, isDragging, ...handlers }: ResizeHandleProps) => {
  const isVertical = panel !== 'bottom'
  return (
    <div className="relative" style={{ gridArea: `${panel}-handle` }}>
      <div
        role="separator"
        aria-label={label}
        aria-orientation={isVertical ? 'vertical' : 'horizontal'}
        aria-valuenow={size}
        aria-valuemin={BOUNDS[panel].min}
        aria-valuemax={BOUNDS[panel].max}
        tabIndex={0}
        data-dragging={isDragging ? '' : undefined}
        className={`absolute z-10 touch-none transition-colors duration-150 hover:bg-accent focus-visible:bg-accent focus-visible:outline-offset-0 data-dragging:bg-accent ${isVertical ? 'inset-y-0 -left-[3px] w-1.5 cursor-col-resize' : 'inset-x-0 -top-[3px] h-1.5 cursor-row-resize'}`}
        {...handlers}
      />
    </div>
  )
}

export type WorkbenchLayoutProps = {
  readonly toolbar: ReactNode
  readonly sidebar: ReactNode
  readonly main: ReactNode
  readonly aside?: ReactNode
  readonly bottom: ReactNode
  readonly sizes: PanelSizes
  readonly resizeLabels: Readonly<Record<ResizablePanel, string>>
  readonly onResize: (panel: ResizablePanel, size: number) => void
}

export const WorkbenchLayout = ({
  toolbar,
  sidebar,
  main,
  aside,
  bottom,
  sizes,
  resizeLabels,
  onResize,
}: WorkbenchLayoutProps) => {
  const grid = useRef<HTMLDivElement>(null)
  const bottomPanel = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<Drag | undefined>(undefined)
  const hasAside = aside !== undefined

  const maxOf = (panel: ResizablePanel) => {
    const box = grid.current?.getBoundingClientRect()
    if (box === undefined || box.width === 0) return BOUNDS[panel].max
    const room =
      panel === 'sidebar'
        ? box.width - (hasAside ? sizes.aside : 0) - MIN_EDITOR_WIDTH
        : panel === 'aside'
          ? box.width - sizes.sidebar - MIN_EDITOR_WIDTH
          : box.height - MIN_EDITOR_HEIGHT
    return Math.max(BOUNDS[panel].min, Math.min(BOUNDS[panel].max, room))
  }

  const clamp = (panel: ResizablePanel, size: number) =>
    Math.round(Math.min(maxOf(panel), Math.max(BOUNDS[panel].min, size)))

  const sizeOf = (panel: ResizablePanel) =>
    sizes[panel] ?? clamp(panel, bottomPanel.current?.getBoundingClientRect().height ?? BOUNDS[panel].min)

  const handlersOf = (panel: ResizablePanel) => ({
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      const { key, shrinkKey } = GROWS[panel]
      const step = event.shiftKey ? LARGE_STEP : STEP
      const size = sizeOf(panel)
      const next =
        event.key === key
          ? size + step
          : event.key === shrinkKey
            ? size - step
            : event.key === 'Home'
              ? BOUNDS[panel].min
              : event.key === 'End'
                ? maxOf(panel)
                : undefined
      if (next === undefined) return
      event.preventDefault()
      onResize(panel, clamp(panel, next))
    },
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return
      event.preventDefault()
      if (typeof event.currentTarget.setPointerCapture === 'function')
        event.currentTarget.setPointerCapture(event.pointerId)
      setDrag({ panel, pointerId: event.pointerId, start: coordinateOf(panel, event), size: sizeOf(panel) })
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      if (drag?.panel !== panel || drag.pointerId !== event.pointerId) return
      const moved = (coordinateOf(panel, event) - drag.start) * GROWS[panel].sign
      onResize(panel, clamp(panel, drag.size + moved))
    },
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => {
      if (drag?.pointerId === event.pointerId) setDrag(undefined)
    },
  })

  const columns = hasAside ? `${sizes.sidebar}px 0px 1fr 0px ${sizes.aside}px` : `${sizes.sidebar}px 0px 1fr`
  const areas = hasAside
    ? `"toolbar toolbar toolbar toolbar toolbar" "sidebar sidebar-handle main aside-handle aside" "sidebar sidebar-handle bottom-handle bottom-handle bottom-handle" "sidebar sidebar-handle bottom bottom bottom"`
    : `"toolbar toolbar toolbar" "sidebar sidebar-handle main" "sidebar sidebar-handle bottom-handle" "sidebar sidebar-handle bottom"`

  return (
    <div
      ref={grid}
      className="grid h-dvh bg-bg"
      style={{
        gridTemplateColumns: columns,
        gridTemplateRows: `auto 1fr 0px ${sizes.bottom === undefined ? DEFAULT_BOTTOM : `${sizes.bottom}px`}`,
        gridTemplateAreas: areas,
      }}
    >
      <header className="border-b border-border bg-bg" style={{ gridArea: 'toolbar' }}>
        {toolbar}
      </header>
      <nav className="min-w-0 overflow-auto border-r border-border bg-surface" style={{ gridArea: 'sidebar' }}>
        {sidebar}
      </nav>
      <ResizeHandle
        panel="sidebar"
        label={resizeLabels.sidebar}
        size={sizes.sidebar}
        isDragging={drag?.panel === 'sidebar'}
        {...handlersOf('sidebar')}
      />
      <main className="min-h-0 min-w-0 overflow-hidden bg-surface-raised" style={{ gridArea: 'main' }}>
        {main}
      </main>
      {hasAside ? (
        <>
          <ResizeHandle
            panel="aside"
            label={resizeLabels.aside}
            size={sizes.aside}
            isDragging={drag?.panel === 'aside'}
            {...handlersOf('aside')}
          />
          <div
            className="min-h-0 min-w-0 overflow-hidden border-l border-border bg-surface"
            style={{ gridArea: 'aside' }}
          >
            {aside}
          </div>
        </>
      ) : null}
      <ResizeHandle
        panel="bottom"
        label={resizeLabels.bottom}
        size={sizeOf('bottom')}
        isDragging={drag?.panel === 'bottom'}
        {...handlersOf('bottom')}
      />
      <div
        ref={bottomPanel}
        className="flex min-h-0 min-w-0 flex-col border-t border-border bg-surface"
        style={{ gridArea: 'bottom' }}
      >
        {bottom}
      </div>
      {drag === undefined ? null : (
        <div
          aria-hidden="true"
          className={`fixed inset-0 z-40 ${drag.panel === 'bottom' ? 'cursor-row-resize' : 'cursor-col-resize'}`}
        />
      )}
    </div>
  )
}
