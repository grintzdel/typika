type FileNode = { readonly kind: 'file'; data: Uint8Array; size: number; mtimeMs: number }
type DirNode = { readonly kind: 'dir'; mtimeMs: number }
type Node = FileNode | DirNode

type OpenFile = { readonly path: string; readonly flags: number; position: number }

type Callback<A = undefined> = (error: Error | null, result?: A) => void

export type OutputStream = 'stdout' | 'stderr'

const S_IFDIR = 0o040000
const S_IFREG = 0o100000
const FIRST_FD = 3

const constants = {
  O_RDONLY: 0,
  O_WRONLY: 1,
  O_RDWR: 2,
  O_CREAT: 0o100,
  O_EXCL: 0o200,
  O_TRUNC: 0o1000,
  O_APPEND: 0o2000,
  O_DIRECTORY: 0o200000,
} as const

const fsError = (code: string, path: string) => Object.assign(new Error(`${code}: ${path}`), { code })

export const normalizePath = (path: string, cwd = '/'): string => {
  const segments: Array<string> = []
  for (const segment of (path.startsWith('/') ? path : `${cwd}/${path}`).split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') segments.pop()
    else segments.push(segment)
  }
  return `/${segments.join('/')}`
}

const parentOf = (path: string) => path.slice(0, Math.max(path.lastIndexOf('/'), 0)) || '/'

const statOf = (node: Node) => ({
  dev: 0,
  ino: 0,
  mode: node.kind === 'dir' ? S_IFDIR | 0o755 : S_IFREG | 0o644,
  nlink: 1,
  uid: 0,
  gid: 0,
  rdev: 0,
  size: node.kind === 'file' ? node.size : 0,
  blksize: 4096,
  blocks: 0,
  atimeMs: node.mtimeMs,
  mtimeMs: node.mtimeMs,
  ctimeMs: node.mtimeMs,
  isDirectory: () => node.kind === 'dir',
})

const writeAt = (node: FileNode, bytes: Uint8Array, position: number) => {
  const end = position + bytes.byteLength
  if (end > node.data.byteLength) {
    const grown = new Uint8Array(Math.max(end, node.data.byteLength * 2))
    grown.set(node.data.subarray(0, node.size))
    node.data = grown
  }
  node.data.set(bytes, position)
  node.size = Math.max(node.size, end)
  node.mtimeMs = Date.now()
}

const run = <A>(callback: Callback<A>, operation: () => A) => {
  let result: A
  try {
    result = operation()
  } catch (error) {
    callback(error instanceof Error ? error : new Error(String(error)))
    return
  }
  callback(null, result)
}

const ok = (callback: Callback, operation: () => void = () => undefined) =>
  run(callback, () => {
    operation()
    return undefined
  })

const ignoreOutput = () => undefined

export const makeMemoryFs = () => {
  const nodes = new Map<string, Node>([['/', { kind: 'dir', mtimeMs: Date.now() }]])
  const openFiles = new Map<number, OpenFile>()
  let nextFd = FIRST_FD
  let cwd = '/'
  let output: (stream: OutputStream, bytes: Uint8Array) => void = ignoreOutput

  const resolve = (path: string) => normalizePath(path, cwd)

  const ensureDir = (path: string) => {
    const node = nodes.get(path)
    if (node?.kind === 'dir') return
    if (node !== undefined) throw fsError('ENOTDIR', path)
    ensureDir(parentOf(path))
    nodes.set(path, { kind: 'dir', mtimeMs: Date.now() })
  }

  const existingDir = (path: string) => {
    const node = nodes.get(path)
    if (node === undefined) throw fsError('ENOENT', path)
    if (node.kind !== 'dir') throw fsError('ENOTDIR', path)
  }

  const fileAt = (fd: number) => {
    const file = openFiles.get(fd)
    if (file === undefined) throw fsError('EBADF', String(fd))
    const node = nodes.get(file.path)
    if (node === undefined) throw fsError('ENOENT', file.path)
    return { file, node }
  }

  const writeFd = (fd: number, bytes: Uint8Array, position: number | null): number => {
    if (fd === 1 || fd === 2) {
      output(fd === 1 ? 'stdout' : 'stderr', bytes.slice())
      return bytes.byteLength
    }
    const { file, node } = fileAt(fd)
    if (node.kind === 'dir') throw fsError('EISDIR', file.path)
    const at = (file.flags & constants.O_APPEND) !== 0 ? node.size : (position ?? file.position)
    writeAt(node, bytes, at)
    if (position === null) file.position = at + bytes.byteLength
    return bytes.byteLength
  }

  const removeTree = (path: string) => {
    for (const key of nodes.keys()) if (key === path || key.startsWith(`${path}/`)) nodes.delete(key)
  }

  const api = {
    constants,
    writeSync: (fd: number, buffer: Uint8Array) => writeFd(fd, buffer, null),
    write: (
      fd: number,
      buffer: Uint8Array,
      offset: number,
      length: number,
      position: number | null,
      callback: Callback<number>
    ) => run(callback, () => writeFd(fd, buffer.subarray(offset, offset + length), position)),
    read: (
      fd: number,
      buffer: Uint8Array,
      offset: number,
      length: number,
      position: number | null,
      callback: Callback<number>
    ) =>
      run(callback, () => {
        if (fd === 0) return 0
        const { file, node } = fileAt(fd)
        if (node.kind === 'dir') throw fsError('EISDIR', file.path)
        const from = position ?? file.position
        const chunk = node.data.subarray(Math.min(from, node.size), Math.min(from + length, node.size))
        buffer.set(chunk, offset)
        if (position === null) file.position = from + chunk.byteLength
        return chunk.byteLength
      }),
    open: (path: string, flags: number, _mode: number, callback: Callback<number>) =>
      run(callback, () => {
        const resolved = resolve(path)
        const existing = nodes.get(resolved)
        if (existing !== undefined && (flags & constants.O_CREAT) !== 0 && (flags & constants.O_EXCL) !== 0) {
          throw fsError('EEXIST', resolved)
        }
        if (existing === undefined) {
          if ((flags & constants.O_CREAT) === 0) throw fsError('ENOENT', resolved)
          existingDir(parentOf(resolved))
          nodes.set(resolved, { kind: 'file', data: new Uint8Array(0), size: 0, mtimeMs: Date.now() })
        } else if (existing.kind === 'file' && (flags & constants.O_TRUNC) !== 0) {
          existing.size = 0
        } else if (existing.kind === 'dir' && (flags & (constants.O_WRONLY | constants.O_RDWR)) !== 0) {
          throw fsError('EISDIR', resolved)
        }
        const fd = nextFd++
        openFiles.set(fd, { path: resolved, flags, position: 0 })
        return fd
      }),
    close: (fd: number, callback: Callback) =>
      ok(callback, () => {
        if (!openFiles.delete(fd)) throw fsError('EBADF', String(fd))
      }),
    fstat: (fd: number, callback: Callback<ReturnType<typeof statOf>>) => run(callback, () => statOf(fileAt(fd).node)),
    stat: (path: string, callback: Callback<ReturnType<typeof statOf>>) =>
      run(callback, () => {
        const node = nodes.get(resolve(path))
        if (node === undefined) throw fsError('ENOENT', path)
        return statOf(node)
      }),
    lstat: (path: string, callback: Callback<ReturnType<typeof statOf>>) => api.stat(path, callback),
    mkdir: (path: string, _perm: number, callback: Callback) =>
      ok(callback, () => {
        const resolved = resolve(path)
        if (nodes.has(resolved)) throw fsError('EEXIST', resolved)
        existingDir(parentOf(resolved))
        nodes.set(resolved, { kind: 'dir', mtimeMs: Date.now() })
      }),
    readdir: (path: string, callback: Callback<Array<string>>) =>
      run(callback, () => {
        const resolved = resolve(path)
        existingDir(resolved)
        const prefix = resolved === '/' ? '/' : `${resolved}/`
        return [...nodes.keys()]
          .filter((key) => key.startsWith(prefix) && key !== resolved && !key.slice(prefix.length).includes('/'))
          .map((key) => key.slice(prefix.length))
      }),
    unlink: (path: string, callback: Callback) =>
      ok(callback, () => {
        const resolved = resolve(path)
        const node = nodes.get(resolved)
        if (node === undefined) throw fsError('ENOENT', resolved)
        if (node.kind === 'dir') throw fsError('EISDIR', resolved)
        nodes.delete(resolved)
      }),
    rmdir: (path: string, callback: Callback) =>
      ok(callback, () => {
        const resolved = resolve(path)
        existingDir(resolved)
        if ([...nodes.keys()].some((key) => key.startsWith(`${resolved}/`))) throw fsError('ENOTEMPTY', resolved)
        nodes.delete(resolved)
      }),
    rename: (from: string, to: string, callback: Callback) =>
      ok(callback, () => {
        const source = resolve(from)
        const target = resolve(to)
        if (!nodes.has(source)) throw fsError('ENOENT', source)
        existingDir(parentOf(target))
        removeTree(target)
        const moving = [...nodes].filter(([key]) => key === source || key.startsWith(`${source}/`))
        for (const [key, node] of moving) {
          nodes.delete(key)
          nodes.set(`${target}${key.slice(source.length)}`, node)
        }
      }),
    ftruncate: (fd: number, length: number, callback: Callback) =>
      ok(callback, () => {
        const { node } = fileAt(fd)
        if (node.kind === 'file') node.size = Math.min(node.size, length)
      }),
    truncate: (path: string, length: number, callback: Callback) =>
      ok(callback, () => {
        const node = nodes.get(resolve(path))
        if (node === undefined) throw fsError('ENOENT', path)
        if (node.kind === 'file') node.size = Math.min(node.size, length)
      }),
    fsync: (_fd: number, callback: Callback) => ok(callback),
    chmod: (_path: string, _mode: number, callback: Callback) => ok(callback),
    fchmod: (_fd: number, _mode: number, callback: Callback) => ok(callback),
    chown: (_path: string, _uid: number, _gid: number, callback: Callback) => ok(callback),
    fchown: (_fd: number, _uid: number, _gid: number, callback: Callback) => ok(callback),
    lchown: (_path: string, _uid: number, _gid: number, callback: Callback) => ok(callback),
    utimes: (_path: string, _atime: number, _mtime: number, callback: Callback) => ok(callback),
    link: (path: string, _link: string, callback: Callback) => callback(fsError('ENOSYS', path)),
    symlink: (path: string, _link: string, callback: Callback) => callback(fsError('ENOSYS', path)),
    readlink: (path: string, callback: Callback<string>) => callback(fsError('EINVAL', path)),
  }

  return {
    api,
    cwd: () => cwd,
    chdir: (path: string) => {
      const resolved = resolve(path)
      existingDir(resolved)
      cwd = resolved
    },
    onOutput: (listener: (stream: OutputStream, bytes: Uint8Array) => void) => {
      output = listener
    },
    writeFile: (path: string, content: Uint8Array) => {
      const resolved = normalizePath(path)
      ensureDir(parentOf(resolved))
      nodes.set(resolved, { kind: 'file', data: content, size: content.byteLength, mtimeMs: Date.now() })
    },
    readFile: (path: string): Uint8Array<ArrayBuffer> | undefined => {
      const node = nodes.get(normalizePath(path))
      return node?.kind === 'file' ? new Uint8Array(node.data.subarray(0, node.size)) : undefined
    },
    exists: (path: string) => nodes.has(normalizePath(path)),
    mkdirAll: (path: string) => ensureDir(normalizePath(path)),
    removeTree: (path: string) => removeTree(normalizePath(path)),
  }
}

export type MemoryFs = ReturnType<typeof makeMemoryFs>
