import { useState } from 'react'

import {
  baseFocus,
  DiffSource,
  fileChanges,
  withoutTourMarkers,
  type FileChange,
} from '../../core/domain/file-changes.domain-model.ts'
import { DiffLayout } from '../components/DiffEditor.tsx'

export type UseDiffOptions = {
  readonly templateFiles: ReadonlyMap<string, string>
  readonly currentFiles: ReadonlyMap<string, string>
  readonly base:
    | {
        readonly name: string
        readonly files: ReadonlyMap<string, string>
        readonly focus: ReadonlyArray<string> | undefined
      }
    | undefined
}

const stripped = (files: ReadonlyMap<string, string>): ReadonlyMap<string, string> =>
  new Map([...files].map(([path, content]) => [path, withoutTourMarkers(content)]))

export const useDiff = ({ templateFiles, currentFiles, base }: UseDiffOptions) => {
  const [chosenSource, setChosenSource] = useState<DiffSource | undefined>(undefined)
  const [layout, setLayout] = useState<DiffLayout>(DiffLayout.SPLIT)

  const source = chosenSource ?? (base === undefined ? DiffSource.MINE : DiffSource.BASE)

  const changesFor = (from: DiffSource): ReadonlyArray<FileChange> =>
    from === DiffSource.BASE
      ? base === undefined
        ? []
        : fileChanges(stripped(base.files), stripped(templateFiles), baseFocus(base.focus))
      : fileChanges(templateFiles, currentFiles, () => true)

  const versionsOf = (from: DiffSource, path: string) =>
    from === DiffSource.BASE
      ? {
          before: withoutTourMarkers(base?.files.get(path) ?? ''),
          after: withoutTourMarkers(templateFiles.get(path) ?? ''),
        }
      : { before: templateFiles.get(path) ?? '', after: currentFiles.get(path) ?? '' }

  return {
    source,
    layout,
    baseName: base?.name,
    changes: changesFor(source),
    versionsOf,
    handleSourceChange: setChosenSource,
    handleLayoutChange: setLayout,
  }
}
