import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'
import { useState } from 'react'

import { DEFAULT_PANEL_SIZES, type PanelSizes, type ResizablePanel } from '../../../../ui/WorkbenchLayout.tsx'

const KEY = 'typika:workbench-sizes'

const StoredSizesSchema = Schema.Struct({
  sidebar: Schema.Number,
  aside: Schema.Number,
  bottom: Schema.optionalKey(Schema.Number),
})

const decodeSizes = Schema.decodeUnknownOption(StoredSizesSchema)

const parse = (text: string | null): PanelSizes | undefined => {
  if (text === null) return undefined
  try {
    const decoded = Option.getOrUndefined(decodeSizes(JSON.parse(text)))
    return decoded === undefined
      ? undefined
      : { sidebar: decoded.sidebar, aside: decoded.aside, bottom: decoded.bottom }
  } catch {
    return undefined
  }
}

const storedSizes = () => {
  try {
    return parse(globalThis.localStorage.getItem(KEY)) ?? DEFAULT_PANEL_SIZES
  } catch {
    return DEFAULT_PANEL_SIZES
  }
}

const storeSizes = (sizes: PanelSizes) => {
  try {
    globalThis.localStorage.setItem(KEY, JSON.stringify(sizes))
  } catch {
    return
  }
}

export const useWorkbenchSizes = () => {
  const [sizes, setSizes] = useState<PanelSizes>(storedSizes)

  return {
    sizes,
    handleResize: (panel: ResizablePanel, size: number) =>
      setSizes((current) => {
        const next = { ...current, [panel]: size }
        storeSizes(next)
        return next
      }),
  }
}
