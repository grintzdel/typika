import { describe, expect, it } from 'vitest'

import { makeMemoryFs, normalizePath } from './memory-fs.ts'

type Callback<A> = (error: Error | null, result?: A) => void

const call = <A>(operation: (callback: Callback<A>) => void): Promise<A | undefined> =>
  new Promise((resolve, reject) => operation((error, result) => (error === null ? resolve(result) : reject(error))))

const bytes = (text: string) => new TextEncoder().encode(text)
const text = (data: Uint8Array | undefined) => new TextDecoder().decode(data)

describe('normalizePath', () => {
  it('resolves dots and relative paths against the working directory', () => {
    expect(normalizePath('../b/./c', '/work/a')).toBe('/work/b/c')
    expect(normalizePath('/x//y/')).toBe('/x/y')
  })
})

describe('makeMemoryFs', () => {
  it('creates, writes, reads back and lists files through the callback API that wasm_exec.js uses', async () => {
    const fs = makeMemoryFs()
    fs.mkdirAll('/tmp')
    const { O_CREAT, O_WRONLY, O_RDONLY } = fs.api.constants

    const fd = await call<number>((done) => fs.api.open('/tmp/a.txt', O_CREAT | O_WRONLY, 0o644, done))
    await call<number>((done) => fs.api.write(fd ?? -1, bytes('hello world'), 0, 11, null, done))
    await call((done) => fs.api.close(fd ?? -1, done))
    const reader = await call<number>((done) => fs.api.open('/tmp/a.txt', O_RDONLY, 0, done))
    const buffer = new Uint8Array(5)
    const read = await call<number>((done) => fs.api.read(reader ?? -1, buffer, 0, 5, 6, done))

    expect(read).toBe(5)
    expect(text(buffer)).toBe('world')
    expect(await call<Array<string>>((done) => fs.api.readdir('/tmp', done))).toEqual(['a.txt'])
    expect((await call<{ size: number }>((done) => fs.api.stat('/tmp/a.txt', done)))?.size).toBe(11)
  })

  it('fails with the error codes Go maps to errno', async () => {
    const fs = makeMemoryFs()
    fs.writeFile('/a/file', bytes('x'))

    await expect(call((done) => fs.api.stat('/a/missing', done))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(call((done) => fs.api.mkdir('/a', 0o755, done))).rejects.toMatchObject({ code: 'EEXIST' })
    await expect(call((done) => fs.api.rmdir('/a', done))).rejects.toMatchObject({ code: 'ENOTEMPTY' })
    await expect(call((done) => fs.api.close(99, done))).rejects.toMatchObject({ code: 'EBADF' })
  })

  it('resolves relative paths against its working directory, and renames trees', async () => {
    const fs = makeMemoryFs()
    fs.writeFile('/work/pkg/data.txt', bytes('data'))
    fs.chdir('/work/pkg')

    await call((done) => fs.api.rename('.', '/moved', done))

    expect(text(fs.readFile('/moved/data.txt'))).toBe('data')
    expect(fs.exists('/work/pkg')).toBe(false)
  })

  it('sends what is written to the standard streams to the output listener', () => {
    const fs = makeMemoryFs()
    const written: Array<string> = []
    fs.onOutput((stream, chunk) => written.push(`${stream}:${text(chunk)}`))

    fs.api.writeSync(1, bytes('out'))
    fs.api.write(2, bytes('err'), 0, 3, null, () => undefined)

    expect(written).toEqual(['stdout:out', 'stderr:err'])
  })
})
