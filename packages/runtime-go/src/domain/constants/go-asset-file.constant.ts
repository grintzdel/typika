export const GoAssetFile = {
  COMPILE: 'compile.wasm',
  LINK: 'link.wasm',
  STD: 'std.pack',
  LICENSE: 'LICENSE',
} as const

export type GoAssetFile = (typeof GoAssetFile)[keyof typeof GoAssetFile]

export const GO_ASSET_MANIFEST = 'manifest.json'
