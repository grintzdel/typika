import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { GO_ASSET_MANIFEST, GoAssetFile } from '../domain/constants/go-asset-file.constant.ts'
import { GoRelease } from '../domain/constants/go-release.constant.ts'
import { isAssetManifest, type GoAssetManifest, type GoToolchain } from '../domain/go-assets.domain-model.ts'
import { decodeStdPack } from '../std-pack/std-pack.ts'

const defaultPackageDir = join(import.meta.dirname, '../..')

export const goAssetsDir = (packageDir: string = defaultPackageDir) => join(packageDir, 'assets', GoRelease.VERSION)

export const readAssetManifest = async (packageDir: string = defaultPackageDir): Promise<GoAssetManifest> => {
  const manifest: unknown = JSON.parse(await readFile(join(goAssetsDir(packageDir), GO_ASSET_MANIFEST), 'utf8'))
  if (!isAssetManifest(manifest)) throw new Error(`Malformed ${GO_ASSET_MANIFEST} in ${goAssetsDir(packageDir)}.`)
  return manifest
}

export const loadGoToolchainFromDisk = async (packageDir: string = defaultPackageDir): Promise<GoToolchain> => {
  const dir = goAssetsDir(packageDir)
  const read = (file: GoAssetFile) =>
    readFile(join(dir, file)).catch((cause: unknown) => {
      throw new Error(`Go assets missing in ${dir}: run \`pnpm --filter @typika/runtime-go build:assets\`.`, { cause })
    })
  const [compile, link, std] = await Promise.all([
    read(GoAssetFile.COMPILE).then((bytes) => WebAssembly.compile(bytes)),
    read(GoAssetFile.LINK).then((bytes) => WebAssembly.compile(bytes)),
    read(GoAssetFile.STD).then((bytes) => decodeStdPack(new Uint8Array(bytes))),
  ])
  return { compile, link, std }
}
