import type { GoAssetFile } from './constants/go-asset-file.constant.ts'

export type GoAssetManifest = {
  readonly goVersion: string
  readonly key: string
  readonly files: ReadonlyArray<{
    readonly name: GoAssetFile
    readonly bytes: number
    readonly brotliBytes: number
    readonly sha256: string
  }>
}

export const isAssetManifest = (value: unknown): value is GoAssetManifest =>
  typeof value === 'object' && value !== null && 'key' in value && 'files' in value && Array.isArray(value.files)

export type GoToolchain = {
  readonly compile: WebAssembly.Module
  readonly link: WebAssembly.Module
  readonly std: ReadonlyMap<string, Uint8Array>
}
