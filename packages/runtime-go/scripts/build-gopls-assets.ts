import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmod, cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { constants, gzipSync } from 'node:zlib'

import { GOPLS_ASSET_MANIFEST, GoplsAssetFile } from '../src/domain/constants/go-asset-file.constant.ts'
import { GoRelease } from '../src/domain/constants/go-release.constant.ts'
import { STD_ROOTS } from '../src/domain/constants/std-roots.constant.ts'
import type { GoplsAssetManifest } from '../src/domain/go-assets.domain-model.ts'
import { goplsAssetsDir, readGoplsAssetManifest } from '../src/node/gopls-assets.ts'
import { listStdPackages, wasmGoEnv } from '../src/node/std-packages.ts'
import { encodeStdPack } from '../src/std-pack/std-pack.ts'

const packageDir = join(import.meta.dirname, '..')
const moduleDir = join(packageDir, 'gopls')
const patchesDir = join(moduleDir, 'patches')
const outDir = goplsAssetsDir(packageDir)
const REPLACED = [
  { path: 'golang.org/x/tools', dir: 'tools' },
  { path: 'golang.org/x/tools/gopls', dir: 'gopls' },
] as const

const go = (args: ReadonlyArray<string>, cwd: string, env: NodeJS.ProcessEnv = wasmGoEnv) =>
  execFileSync('go', args, { cwd, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim()

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

const gzip = (bytes: Uint8Array) => gzipSync(bytes, { level: constants.Z_BEST_COMPRESSION })

const patches = async () => (await readdir(patchesDir)).filter((name) => name.endsWith('.patch')).toSorted()

const buildKey = async () => {
  const inputs = [
    import.meta.filename,
    join(moduleDir, 'go.mod'),
    join(moduleDir, 'go.sum'),
    ...(await patches()).map((name) => join(patchesDir, name)),
  ]
  const contents = await Promise.all(inputs.map((path) => readFile(path, 'utf8')))
  return sha256(new TextEncoder().encode([GoRelease.VERSION, ...STD_ROOTS, ...Object.values(GoplsAssetFile), ...contents].join('\n')))
}

const makeWritable = async (dir: string): Promise<void> => {
  await chmod(dir, 0o755)
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) await makeWritable(path)
    else await chmod(path, 0o644)
  }
}

const versionOf = (goMod: string, path: string) => {
  const version = new RegExp(`^\\s*${path.replaceAll('.', '\\.')}\\s+(v\\S+)\\s*$`, 'm').exec(goMod)?.[1]
  if (version === undefined) throw new Error(`No version of ${path} in ${moduleDir}/go.mod.`)
  return version
}

const prepareModule = async (work: string) => {
  const goMod = await readFile(join(moduleDir, 'go.mod'), 'utf8')
  await cp(join(moduleDir, 'go.mod'), join(work, 'go.mod'))
  await cp(join(moduleDir, 'go.sum'), join(work, 'go.sum'))
  const downloads = await mkdtemp(join(tmpdir(), 'typika-gopls-download-'))
  try {
    for (const { path, dir } of REPLACED) {
      const downloaded: unknown = JSON.parse(
        go(['mod', 'download', '-json', `${path}@${versionOf(goMod, path)}`], downloads, process.env)
      )
      if (typeof downloaded !== 'object' || downloaded === null || !('Dir' in downloaded)) {
        throw new Error(`go mod download gave no directory for ${path}.`)
      }
      await cp(String(downloaded.Dir), join(work, dir), { recursive: true })
      await makeWritable(join(work, dir))
    }
  } finally {
    await rm(downloads, { recursive: true, force: true })
  }
  for (const patch of await patches()) {
    execFileSync('git', ['apply', '-p1', join(patchesDir, patch)], { cwd: work })
  }
}

const licensesOf = async (work: string, goroot: string) => {
  const modules = go(
    ['list', '-deps', '-f', '{{with .Module}}{{.Path}}\t{{.Dir}}{{end}}', 'golang.org/x/tools/gopls'],
    work
  )
    .split('\n')
    .flatMap((line) => {
      const [name, dir] = line.split('\t')
      return name === undefined || dir === undefined ? [] : [{ name, dir }]
    })
  const sections = [
    { name: `Go ${GoRelease.VERSION}`, dir: goroot },
    ...new Map(modules.map((module) => [module.name, module])).values(),
  ]
  const texts = await Promise.all(
    sections
      .toSorted((a, b) => a.name.localeCompare(b.name))
      .map(async ({ name, dir }) => {
        const files = (await readdir(dir)).filter((file) => /^(LICENSE|LICENCE|COPYING)/i.test(file)).toSorted()
        if (files.length === 0) throw new Error(`No license file for ${name} in ${dir}.`)
        const licenses = await Promise.all(files.map((file) => readFile(join(dir, file), 'utf8')))
        return `${name}\n${'='.repeat(name.length)}\n\n${licenses.join('\n').trim()}\n`
      })
  )
  return texts.join('\n')
}

const stdAssets = async (goroot: string) => {
  const packages = listStdPackages()
  const paths = [...packages.values()].flatMap((pkg) =>
    [...new Set([...(pkg.GoFiles ?? []), ...(pkg.CompiledGoFiles ?? [])])].map((file) => `${pkg.Dir}/${file}`)
  )
  const sources = new Map(
    await Promise.all(paths.map(async (path) => [path, new Uint8Array(await readFile(join(goroot, path)))] as const))
  )
  return {
    sources: encodeStdPack(sources),
    packages: new TextEncoder().encode(JSON.stringify([...packages.values()])),
  }
}

const main = async () => {
  const version = go(['env', 'GOVERSION'], packageDir)
  if (version !== GoRelease.VERSION) {
    throw new Error(`gopls is built with ${GoRelease.VERSION}, but \`go\` is ${version}.`)
  }
  const key = await buildKey()
  const existing = await readGoplsAssetManifest(packageDir).catch(() => undefined)
  if (existing?.key === key) return

  const goroot = go(['env', 'GOROOT'], packageDir)
  const work = await mkdtemp(join(tmpdir(), 'typika-gopls-'))
  try {
    await prepareModule(work)
    const gopls = join(work, 'gopls.wasm')
    go(['build', '-trimpath', '-buildvcs=false', '-ldflags=-s -w', '-o', gopls, 'golang.org/x/tools/gopls'], work)
    const std = await stdAssets(goroot)
    const raw: ReadonlyArray<readonly [GoplsAssetFile, Uint8Array]> = [
      [GoplsAssetFile.GOPLS, new Uint8Array(await readFile(gopls))],
      [GoplsAssetFile.STD_SOURCES, std.sources],
      [GoplsAssetFile.STD_PACKAGES, std.packages],
    ]
    const licenses = new TextEncoder().encode(await licensesOf(work, goroot))

    await rm(outDir, { recursive: true, force: true })
    await mkdir(outDir, { recursive: true })
    const files: Array<GoplsAssetManifest['files'][number]> = []
    for (const [name, bytes] of raw) {
      const compressed = gzip(bytes)
      await writeFile(join(outDir, name), compressed)
      files.push({ name, bytes: compressed.byteLength, rawBytes: bytes.byteLength, sha256: sha256(compressed) })
    }
    await writeFile(join(outDir, GoplsAssetFile.LICENSES), licenses)
    files.push({
      name: GoplsAssetFile.LICENSES,
      bytes: licenses.byteLength,
      rawBytes: licenses.byteLength,
      sha256: sha256(licenses),
    })
    const manifest: GoplsAssetManifest = { goVersion: GoRelease.VERSION, key, files }
    await writeFile(join(outDir, GOPLS_ASSET_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`)
    const total = files.reduce((sum, file) => sum + file.bytes, 0)
    console.log(`gopls assets written to ${outDir} (${(total / 1e6).toFixed(1)} MB in gzip).`)
  } finally {
    await rm(work, { recursive: true, force: true })
  }
}

await main()
