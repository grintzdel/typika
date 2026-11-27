import { RuntimeAssetLoadError, type RuntimeLoadProgress } from '@typika/runtime-core'

import { fetchCachedAsset, openAssetCache } from '../asset-cache/asset-cache.ts'
import { GoAssetFile } from '../domain/constants/go-asset-file.constant.ts'
import type { GoAssetManifest } from '../domain/go-assets.domain-model.ts'

export type GoAssetBytes = {
  readonly compile: WebAssembly.Module
  readonly link: WebAssembly.Module
  readonly std: Uint8Array
}

export const GO_ASSET_CACHE_PREFIX = 'typika-go-'

const LOADED = [GoAssetFile.COMPILE, GoAssetFile.LINK, GoAssetFile.STD] as const

export const loadGoAssets = async (
  assetsUrl: string,
  manifest: GoAssetManifest,
  onProgress: (progress: RuntimeLoadProgress) => void
): Promise<GoAssetBytes> => {
  const cache = await openAssetCache(GO_ASSET_CACHE_PREFIX, manifest.key)
  const fileOf = (name: GoAssetFile) => {
    const file = manifest.files.find((candidate) => candidate.name === name)
    if (file === undefined) throw new RuntimeAssetLoadError({ asset: name, cause: 'Missing from the asset manifest' })
    return file
  }
  const files = LOADED.map(fileOf)
  for (const file of files) onProgress({ asset: file.name, loadedBytes: 0, totalBytes: file.bytes })

  const load = async <A>(name: GoAssetFile, decode: (bytes: Uint8Array<ArrayBuffer>) => A | Promise<A>) => {
    const file = fileOf(name)
    const url = new URL(file.name, assetsUrl).href
    try {
      const bytes = await fetchCachedAsset(cache, url, file, (loadedBytes) =>
        onProgress({ asset: file.name, loadedBytes, totalBytes: file.bytes })
      )
      onProgress({ asset: file.name, loadedBytes: file.bytes, totalBytes: file.bytes })
      return await decode(bytes)
    } catch (cause) {
      throw new RuntimeAssetLoadError({ asset: file.name, cause })
    }
  }

  const [compile, link, std] = await Promise.all([
    load(GoAssetFile.COMPILE, (bytes) => WebAssembly.compile(bytes)),
    load(GoAssetFile.LINK, (bytes) => WebAssembly.compile(bytes)),
    load(GoAssetFile.STD, (bytes) => bytes),
  ])
  return { compile, link, std }
}
