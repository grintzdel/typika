export type CachedAssetFile = { readonly name: string; readonly bytes: number; readonly sha256: string }

const hexOf = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')

export const openAssetCache = async (prefix: string, key: string): Promise<Cache | undefined> => {
  const name = `${prefix}${key}`
  try {
    const cache = await caches.open(name)
    for (const stale of await caches.keys()) if (stale.startsWith(prefix) && stale !== name) await caches.delete(stale)
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

export const fetchCachedAsset = async (
  cache: Cache | undefined,
  url: string,
  file: CachedAssetFile,
  onProgress: (loadedBytes: number) => void
): Promise<Uint8Array<ArrayBuffer>> => {
  const cached = await readCached(cache, url)
  if (cached !== undefined) return cached
  const bytes = await download(url, file.bytes, onProgress)
  if (hexOf(await crypto.subtle.digest('SHA-256', bytes)) !== file.sha256)
    throw new Error('The asset does not match its SHA-256 in the manifest')
  await cache?.put(url, new Response(bytes)).catch(() => undefined)
  return bytes
}
