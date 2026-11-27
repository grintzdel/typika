import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { GOPLS_ASSET_MANIFEST, GoplsAssetFile } from '../domain/constants/go-asset-file.constant.ts'
import { isGoplsAssetManifest, type GoplsAssetManifest, type GoplsAssets } from '../domain/go-assets.domain-model.ts'
import { decodeGoplsAssets } from '../load-gopls-assets/load-gopls-assets.ts'

const defaultPackageDir = join(import.meta.dirname, '../..')

export const goplsAssetsDir = (packageDir: string = defaultPackageDir) => join(packageDir, 'assets', 'gopls')

const missing = (dir: string, cause: unknown) =>
  new Error(`gopls assets missing in ${dir}: run \`pnpm --filter @typika/runtime-go build:assets\`.`, { cause })

export const readGoplsAssetManifest = async (packageDir: string = defaultPackageDir): Promise<GoplsAssetManifest> => {
  const dir = goplsAssetsDir(packageDir)
  const manifest: unknown = JSON.parse(
    await readFile(join(dir, GOPLS_ASSET_MANIFEST), 'utf8').catch((cause: unknown) => {
      throw missing(dir, cause)
    })
  )
  if (!isGoplsAssetManifest(manifest)) throw new Error(`Malformed ${GOPLS_ASSET_MANIFEST} in ${dir}.`)
  return manifest
}

export const loadGoplsAssetsFromDisk = async (packageDir: string = defaultPackageDir): Promise<GoplsAssets> => {
  const dir = goplsAssetsDir(packageDir)
  const read = (file: GoplsAssetFile) =>
    readFile(join(dir, file)).then(
      (bytes) => new Uint8Array(bytes),
      (cause: unknown) => {
        throw missing(dir, cause)
      }
    )
  const [gopls, sources, packages] = await Promise.all([
    read(GoplsAssetFile.GOPLS),
    read(GoplsAssetFile.STD_SOURCES),
    read(GoplsAssetFile.STD_PACKAGES),
  ])
  return decodeGoplsAssets({
    [GoplsAssetFile.GOPLS]: gopls,
    [GoplsAssetFile.STD_SOURCES]: sources,
    [GoplsAssetFile.STD_PACKAGES]: packages,
  })
}
