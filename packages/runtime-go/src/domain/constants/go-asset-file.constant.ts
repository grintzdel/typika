export const GoAssetFile = {
  COMPILE: 'compile.wasm',
  LINK: 'link.wasm',
  STD: 'std.pack',
  LICENSE: 'LICENSE',
} as const

export type GoAssetFile = (typeof GoAssetFile)[keyof typeof GoAssetFile]

export const GO_ASSET_MANIFEST = 'manifest.json'

export const BROTLI_SUFFIX = '.br'

export const GoplsAssetFile = {
  GOPLS: 'gopls.wasm.gzip',
  STD_SOURCES: 'std-sources.pack.gzip',
  STD_PACKAGES: 'std-packages.json.gzip',
  LICENSES: 'gopls-licenses.txt',
} as const

export type GoplsAssetFile = (typeof GoplsAssetFile)[keyof typeof GoplsAssetFile]

export const GOPLS_ASSET_MANIFEST = 'gopls-manifest.json'
