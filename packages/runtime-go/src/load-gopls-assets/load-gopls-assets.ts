import { RuntimeAssetLoadError, type RuntimeLoadProgress } from '@typika/runtime-core'

import { fetchCachedAsset, openAssetCache } from '../asset-cache/asset-cache.ts'
import { GoplsAssetFile } from '../domain/constants/go-asset-file.constant.ts'
import type { GoplsAssetManifest, GoplsAssets } from '../domain/go-assets.domain-model.ts'
import { isGoListPackage } from '../domain/go-list.domain-model.ts'
import { decodeStdPack } from '../std-pack/std-pack.ts'

export const GOPLS_ASSET_CACHE_PREFIX = 'typika-gopls-'

const LOADED = [GoplsAssetFile.GOPLS, GoplsAssetFile.STD_SOURCES, GoplsAssetFile.STD_PACKAGES] as const

export type GoplsAssetBytes = Readonly<Record<(typeof LOADED)[number], Uint8Array<ArrayBuffer>>>

const gunzip = async (bytes: Uint8Array<ArrayBuffer>) =>
  new Uint8Array(
    await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
  )

const decodePackages = (bytes: Uint8Array) => {
  const packages: unknown = JSON.parse(new TextDecoder().decode(bytes))
  if (!Array.isArray(packages) || !packages.every(isGoListPackage)) throw new Error('Malformed standard metadata.')
  return new Map(packages.map((pkg) => [pkg.ImportPath, pkg]))
}

export const decodeGoplsAssets = async (compressed: GoplsAssetBytes): Promise<GoplsAssets> => {
  const [gopls, sources, packages] = await Promise.all([
    gunzip(compressed[GoplsAssetFile.GOPLS]).then((bytes) => WebAssembly.compile(bytes)),
    gunzip(compressed[GoplsAssetFile.STD_SOURCES]).then(decodeStdPack),
    gunzip(compressed[GoplsAssetFile.STD_PACKAGES]).then(decodePackages),
  ])
  return { gopls, sources, packages }
}

export const loadGoplsAssets = async (
  assetsUrl: string,
  manifest: GoplsAssetManifest,
  onProgress: (progress: RuntimeLoadProgress) => void
): Promise<GoplsAssets> => {
  const cache = await openAssetCache(GOPLS_ASSET_CACHE_PREFIX, manifest.key)
  const fileOf = (name: GoplsAssetFile) => {
    const file = manifest.files.find((candidate) => candidate.name === name)
    if (file === undefined) throw new RuntimeAssetLoadError({ asset: name, cause: 'Missing from the asset manifest' })
    return file
  }
  for (const file of LOADED.map(fileOf)) onProgress({ asset: file.name, loadedBytes: 0, totalBytes: file.bytes })

  const load = async (name: (typeof LOADED)[number]) => {
    const file = fileOf(name)
    try {
      const bytes = await fetchCachedAsset(cache, new URL(file.name, assetsUrl).href, file, (loadedBytes) =>
        onProgress({ asset: file.name, loadedBytes, totalBytes: file.bytes })
      )
      onProgress({ asset: file.name, loadedBytes: file.bytes, totalBytes: file.bytes })
      return bytes
    } catch (cause) {
      throw new RuntimeAssetLoadError({ asset: file.name, cause })
    }
  }

  const [gopls, sources, packages] = await Promise.all([
    load(GoplsAssetFile.GOPLS),
    load(GoplsAssetFile.STD_SOURCES),
    load(GoplsAssetFile.STD_PACKAGES),
  ])
  try {
    return await decodeGoplsAssets({
      [GoplsAssetFile.GOPLS]: gopls,
      [GoplsAssetFile.STD_SOURCES]: sources,
      [GoplsAssetFile.STD_PACKAGES]: packages,
    })
  } catch (cause) {
    throw new RuntimeAssetLoadError({ asset: assetsUrl, cause })
  }
}
