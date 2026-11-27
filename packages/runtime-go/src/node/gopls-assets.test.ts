import { describe, expect, it } from 'vitest'

import { GoplsAssetFile } from '../domain/constants/go-asset-file.constant.ts'
import { loadGoplsAssetsFromDisk, readGoplsAssetManifest } from './gopls-assets.ts'
import { listStdPackages } from './std-packages.ts'

describe('the gopls assets', () => {
  it('lists gopls, the standard sources and their metadata, each gzip-compressed', async () => {
    const manifest = await readGoplsAssetManifest()

    expect(manifest.files.map((file) => file.name).toSorted()).toEqual(Object.values(GoplsAssetFile).toSorted())
    for (const file of manifest.files.filter((candidate) => candidate.name !== GoplsAssetFile.LICENSES)) {
      expect(file.bytes).toBeLessThan(file.rawBytes)
    }
  })

  it('carries the go list metadata of the standard packages for js/wasm', async () => {
    const { packages } = await loadGoplsAssetsFromDisk()

    expect(packages).toEqual(listStdPackages())
    expect(packages.get('fmt')).toMatchObject({ Dir: 'src/fmt', Name: 'fmt' })
    expect(packages.has('builtin')).toBe(true)
  })

  it('carries every Go file of every standard package, under its GOROOT path', async () => {
    const { packages, sources } = await loadGoplsAssetsFromDisk()

    const expected = [...packages.values()].flatMap((pkg) =>
      [...new Set([...(pkg.GoFiles ?? []), ...(pkg.CompiledGoFiles ?? [])])].map((file) => `${pkg.Dir}/${file}`)
    )
    expect([...sources.keys()].toSorted()).toEqual(expected.toSorted())
    expect(new TextDecoder().decode(sources.get('src/builtin/builtin.go'))).toContain('package builtin')
  })

  it('carries gopls compiled for js/wasm', async () => {
    const { gopls } = await loadGoplsAssetsFromDisk()

    expect(WebAssembly.Module.exports(gopls).map((entry) => entry.name)).toContain('run')
  })
})
