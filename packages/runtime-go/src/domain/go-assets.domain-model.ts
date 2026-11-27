import type { GoAssetFile, GoplsAssetFile } from './constants/go-asset-file.constant.ts'
import type { StdPackages } from './go-list.domain-model.ts'

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

export type GoplsAssetManifest = {
  readonly goVersion: string
  readonly key: string
  readonly files: ReadonlyArray<{
    readonly name: GoplsAssetFile
    readonly bytes: number
    readonly rawBytes: number
    readonly sha256: string
  }>
}

export const isGoplsAssetManifest = (value: unknown): value is GoplsAssetManifest =>
  isAssetManifest(value) &&
  value.files.every((file: unknown) => typeof file === 'object' && file !== null && 'rawBytes' in file)

export type GoplsAssets = {
  readonly gopls: WebAssembly.Module
  readonly sources: ReadonlyMap<string, Uint8Array>
  readonly packages: StdPackages
}
