export type FileTreeNode =
  | { readonly _tag: 'File'; readonly name: string; readonly path: string }
  | {
      readonly _tag: 'Folder'
      readonly name: string
      readonly path: string
      readonly children: ReadonlyArray<FileTreeNode>
    }

type MutableFolder = { readonly folders: Map<string, MutableFolder>; readonly files: Array<string> }

const toNodes = (folder: MutableFolder, prefix: string): ReadonlyArray<FileTreeNode> => [
  ...[...folder.folders.entries()]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([name, child]): FileTreeNode => ({
      _tag: 'Folder',
      name,
      path: `${prefix}${name}`,
      children: toNodes(child, `${prefix}${name}/`),
    })),
  ...folder.files
    .toSorted((a, b) => a.localeCompare(b))
    .map((name): FileTreeNode => ({ _tag: 'File', name, path: `${prefix}${name}` })),
]

export const buildFileTree = (paths: Iterable<string>): ReadonlyArray<FileTreeNode> => {
  const root: MutableFolder = { folders: new Map(), files: [] }
  for (const path of paths) {
    const segments = path.split('/')
    const name = segments.pop() ?? path
    let folder = root
    for (const segment of segments) {
      let child = folder.folders.get(segment)
      if (child === undefined) {
        child = { folders: new Map(), files: [] }
        folder.folders.set(segment, child)
      }
      folder = child
    }
    folder.files.push(name)
  }
  return toNodes(root, '')
}
