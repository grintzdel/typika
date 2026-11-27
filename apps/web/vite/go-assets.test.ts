import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { GoRelease, type GoAssetManifest, type GoplsAssetManifest } from '@typika/runtime-go'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { GO_ASSETS_MODULE, goAssetsPlugin } from './go-assets.ts'

const MANIFEST: GoAssetManifest = {
  goVersion: GoRelease.VERSION,
  key: '0123456789abcdef0123456789abcdef',
  files: [
    { name: 'compile.wasm', bytes: 7, brotliBytes: 3, sha256: 'a' },
    { name: 'link.wasm', bytes: 4, brotliBytes: 2, sha256: 'b' },
    { name: 'std.pack', bytes: 3, brotliBytes: 1, sha256: 'c' },
    { name: 'LICENSE', bytes: 3, brotliBytes: 1, sha256: 'd' },
  ],
}

const GOPLS_MANIFEST: GoplsAssetManifest = {
  goVersion: GoRelease.VERSION,
  key: 'fedcba9876543210fedcba9876543210',
  files: [
    { name: 'gopls.wasm.gzip', bytes: 5, rawBytes: 9, sha256: 'e' },
    { name: 'std-sources.pack.gzip', bytes: 3, rawBytes: 6, sha256: 'f' },
    { name: 'std-packages.json.gzip', bytes: 2, rawBytes: 4, sha256: '0' },
    { name: 'gopls-licenses.txt', bytes: 8, rawBytes: 8, sha256: '1' },
  ],
}

const callHook = (hook: unknown, context: object, ...args: ReadonlyArray<unknown>): unknown => {
  const handler: unknown = typeof hook === 'object' && hook !== null && 'handler' in hook ? hook.handler : hook
  if (typeof handler !== 'function') throw new Error('Expected a hook function')
  return Reflect.apply(handler, context, args)
}

const loadModule = (plugin: ReturnType<typeof goAssetsPlugin>) => {
  callHook(plugin.configResolved, {}, { base: '/runtime/' })
  const id = callHook(plugin.resolveId, {}, GO_ASSETS_MODULE)
  return Promise.resolve(callHook(plugin.load, {}, id))
}

describe('goAssetsPlugin', () => {
  let packageDir: string

  beforeEach(async () => {
    packageDir = await mkdtemp(join(tmpdir(), 'typika-go-assets-'))
  })
  afterEach(() => rm(packageDir, { recursive: true, force: true }))

  const writeAssets = async () => {
    const dir = join(packageDir, 'assets', GoRelease.VERSION)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'manifest.json'), JSON.stringify(MANIFEST))
    const goplsDir = join(packageDir, 'assets', 'gopls')
    await mkdir(goplsDir, { recursive: true })
    await writeFile(join(goplsDir, 'gopls-manifest.json'), JSON.stringify(GOPLS_MANIFEST))
    await Promise.all(GOPLS_MANIFEST.files.map((file) => writeFile(join(goplsDir, file.name), file.name)))
    await Promise.all(
      MANIFEST.files.flatMap((file) => [
        writeFile(join(dir, file.name), file.name),
        writeFile(join(dir, `${file.name}.br`), `br:${file.name}`),
      ])
    )
  }

  it('exposes the asset URL and the manifest to the runtime frame', async () => {
    await writeAssets()

    await expect(loadModule(goAssetsPlugin(packageDir))).resolves.toBe(
      `export default ${JSON.stringify({
        assetsUrl: '/runtime/assets/go/0123456789abcdef/',
        manifest: MANIFEST,
        gopls: { assetsUrl: '/runtime/assets/gopls/fedcba9876543210/', manifest: GOPLS_MANIFEST },
      })}`
    )
  })

  it('copies each asset and its brotli version next to the bundle', async () => {
    await writeAssets()
    const plugin = goAssetsPlugin(packageDir)
    await loadModule(plugin)
    const outDir = join(packageDir, 'dist')

    await callHook(plugin.writeBundle, {}, { dir: outDir })

    const copied = join(outDir, 'assets', 'go', '0123456789abcdef')
    await expect(readFile(join(copied, 'compile.wasm'), 'utf8')).resolves.toBe('compile.wasm')
    await expect(readFile(join(copied, 'std.pack.br'), 'utf8')).resolves.toBe('br:std.pack')
    await expect(readFile(join(copied, 'LICENSE'), 'utf8')).resolves.toBe('LICENSE')
  })

  it('copies the gopls assets as they are, in a folder of their own', async () => {
    await writeAssets()
    const plugin = goAssetsPlugin(packageDir)
    await loadModule(plugin)
    const outDir = join(packageDir, 'dist')

    await callHook(plugin.writeBundle, {}, { dir: outDir })

    const copied = join(outDir, 'assets', 'gopls', 'fedcba9876543210')
    await expect(readFile(join(copied, 'gopls.wasm.gzip'), 'utf8')).resolves.toBe('gopls.wasm.gzip')
    await expect(readFile(join(copied, 'gopls-licenses.txt'), 'utf8')).resolves.toBe('gopls-licenses.txt')
    await expect(readFile(join(copied, 'gopls.wasm.gzip.br'), 'utf8')).rejects.toThrow(/ENOENT/)
  })

  it('says how to build the assets when they are missing', async () => {
    await expect(loadModule(goAssetsPlugin(packageDir))).rejects.toThrow(/build:assets/)
  })
})
