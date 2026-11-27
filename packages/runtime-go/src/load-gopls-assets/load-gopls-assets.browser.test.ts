import type { RuntimeLoadProgress } from '@typika/runtime-core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GoplsAssetFile } from '../domain/constants/go-asset-file.constant.ts'
import { isGoplsAssetManifest, type GoplsAssetManifest } from '../domain/go-assets.domain-model.ts'
import { GOPLS_ASSET_CACHE_PREFIX, loadGoplsAssets } from './load-gopls-assets.ts'

const manifestUrl = new URL('../../assets/gopls/gopls-manifest.json', import.meta.url)
const assetsUrl = new URL('.', manifestUrl).href
const fetchedManifest: unknown = await fetch(manifestUrl).then((response) => response.json())
if (!isGoplsAssetManifest(fetchedManifest)) throw new Error(`Malformed ${manifestUrl.href}`)
const manifest = fetchedManifest
const LOADED = [GoplsAssetFile.GOPLS, GoplsAssetFile.STD_SOURCES, GoplsAssetFile.STD_PACKAGES]

const clearCaches = async () => {
  for (const name of await caches.keys()) if (name.startsWith(GOPLS_ASSET_CACHE_PREFIX)) await caches.delete(name)
}

const fileOf = (name: GoplsAssetFile) => manifest.files.find((file) => file.name === name)

describe('loadGoplsAssets', () => {
  beforeEach(clearCaches)
  afterEach(() => vi.restoreAllMocks())

  it('downloads gopls and the standard sources, then reads them from the cache', async () => {
    const progress: Array<RuntimeLoadProgress> = []

    const assets = await loadGoplsAssets(assetsUrl, manifest, (item) => progress.push(item))

    expect(WebAssembly.Module.exports(assets.gopls).map((entry) => entry.name)).toContain('run')
    expect(new TextDecoder().decode(assets.sources.get('src/fmt/print.go'))).toContain('package fmt')
    expect(assets.packages.get('fmt')).toMatchObject({ Dir: 'src/fmt' })
    for (const name of LOADED) {
      const bytes = fileOf(name)?.bytes
      expect(progress.findLast((item) => item.asset === name)).toEqual({
        asset: name,
        loadedBytes: bytes,
        totalBytes: bytes,
      })
    }

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await loadGoplsAssets(assetsUrl, manifest, () => undefined)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('keeps the files compressed in Cache Storage', async () => {
    await loadGoplsAssets(assetsUrl, manifest, () => undefined)

    const cache = await caches.open(`${GOPLS_ASSET_CACHE_PREFIX}${manifest.key}`)
    for (const name of LOADED) {
      const cached = await cache.match(new URL(name, assetsUrl).href)
      expect((await cached?.arrayBuffer())?.byteLength).toBe(fileOf(name)?.bytes)
    }
  })

  it('refuses a file whose hash does not match the manifest', async () => {
    const tampered: GoplsAssetManifest = {
      ...manifest,
      key: 'tampered',
      files: manifest.files.map((file) =>
        file.name === GoplsAssetFile.STD_SOURCES ? { ...file, sha256: '0'.repeat(64) } : file
      ),
    }

    await expect(loadGoplsAssets(assetsUrl, tampered, () => undefined)).rejects.toMatchObject({
      _tag: 'RuntimeAssetLoadError',
      asset: GoplsAssetFile.STD_SOURCES,
    })
  })
})
