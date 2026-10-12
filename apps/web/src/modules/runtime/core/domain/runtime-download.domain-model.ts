import type { RuntimeLoadProgress } from '@typika/runtime-core'

export type RuntimeDownload = { readonly loadedBytes: number; readonly totalBytes: number }

export type AssetDownloads = Readonly<Record<string, RuntimeLoadProgress>>

export const NO_DOWNLOADS: AssetDownloads = {}

export const recordDownload = (downloads: AssetDownloads, progress: RuntimeLoadProgress): AssetDownloads => ({
  ...downloads,
  [progress.asset]: progress,
})

export const totalDownload = (downloads: AssetDownloads): RuntimeDownload =>
  Object.values(downloads).reduce(
    (total, progress) => ({
      loadedBytes: total.loadedBytes + progress.loadedBytes,
      totalBytes: total.totalBytes + progress.totalBytes,
    }),
    { loadedBytes: 0, totalBytes: 0 }
  )

export const isDownloading = (download: RuntimeDownload | undefined): download is RuntimeDownload =>
  download !== undefined && download.totalBytes > 0 && download.loadedBytes < download.totalBytes
