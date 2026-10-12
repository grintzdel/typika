declare module 'virtual:typika/go-assets' {
  const assets: { readonly assetsUrl: string; readonly manifest: import('@typika/runtime-go').GoAssetManifest }
  export default assets
}
