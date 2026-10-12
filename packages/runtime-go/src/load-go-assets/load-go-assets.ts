import { RuntimeAssetLoadError, type RuntimeLoadProgress } from '@typika/runtime-core'

import { GoAssetFile } from '../domain/constants/go-asset-file.constant.ts'
import type { GoAssetManifest } from '../domain/go-assets.domain-model.ts'

export type GoAssetBytes = {
  readonly compile: WebAssembly.Module
  readonly link: WebAssembly.Module
  readonly std: Uint8Array
}

export const GO_ASSET_CACHE_PREFIX = 'typika-go-'

const LOADED = [GoAssetFile.COMPILE, GoAssetFile.LINK, GoAssetFile.STD] as const

const hexOf = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')

const openCache = async (name: string): Promise<Cache | undefined> => {
  try {
    const cache = await caches.open(name)
    for (const stale of await caches.keys())
      if (stale.startsWith(GO_ASSET_CACHE_PREFIX) && stale !== name) await caches.delete(stale)
    return cache
  } catch {
    return undefined
  }
}

const download = async (url: string, totalBytes: number, onProgress: (loadedBytes: number) => void) => {
  const response = await fetch(url)
  if (!response.ok || response.body === null) throw new Error(`HTTP ${response.status}`)
  const bytes = new Uint8Array(totalBytes)
  let loadedBytes = 0
  for await (const chunk of response.body) {
    if (loadedBytes + chunk.byteLength > totalBytes) throw new Error('The asset is larger than its manifest says')
    bytes.set(chunk, loadedBytes)
    loadedBytes += chunk.byteLength
    onProgress(loadedBytes)
  }
  if (loadedBytes !== totalBytes) throw new Error(`Received ${loadedBytes} of ${totalBytes} bytes`)
  return bytes
}

const readCached = async (cache: Cache | undefined, url: string) => {
  const response = await cache?.match(url).catch(() => undefined)
  return response === undefined ? undefined : new Uint8Array(await response.arrayBuffer())
}

export const loadGoAssets = async (
  assetsUrl: string,
  manifest: GoAssetManifest,
  onProgress: (progress: RuntimeLoadProgress) => void
): Promise<GoAssetBytes> => {
  const cache = await openCache(`${GO_ASSET_CACHE_PREFIX}${manifest.key}`)
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
      const cached = await readCached(cache, url)
      const bytes =
        cached ??
        (await download(url, file.bytes, (loadedBytes) =>
          onProgress({ asset: file.name, loadedBytes, totalBytes: file.bytes })
        ))
      if (cached === undefined) {
        if (hexOf(await crypto.subtle.digest('SHA-256', bytes)) !== file.sha256)
          throw new Error('The asset does not match its SHA-256 in the manifest')
        await cache?.put(url, new Response(bytes)).catch(() => undefined)
      }
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
