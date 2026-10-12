import { describe, expect, it } from 'vitest'

import { isDownloading, NO_DOWNLOADS, recordDownload, totalDownload } from './runtime-download.domain-model.ts'

describe('runtime download', () => {
  it('adds up the latest progress of each asset', () => {
    const downloads = [
      { asset: 'compile.wasm', loadedBytes: 0, totalBytes: 40 },
      { asset: 'std.pack', loadedBytes: 0, totalBytes: 30 },
      { asset: 'compile.wasm', loadedBytes: 25, totalBytes: 40 },
    ].reduce(recordDownload, NO_DOWNLOADS)

    expect(totalDownload(downloads)).toEqual({ loadedBytes: 25, totalBytes: 70 })
  })

  it('downloads until every byte arrived', () => {
    expect(isDownloading({ loadedBytes: 25, totalBytes: 70 })).toBe(true)
    expect(isDownloading({ loadedBytes: 70, totalBytes: 70 })).toBe(false)
    expect(isDownloading(totalDownload(NO_DOWNLOADS))).toBe(false)
  })
})
