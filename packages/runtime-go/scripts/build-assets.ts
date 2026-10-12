import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { brotliCompressSync, constants } from 'node:zlib'

import { BROTLI_SUFFIX, GO_ASSET_MANIFEST, GoAssetFile } from '../src/domain/constants/go-asset-file.constant.ts'
import { GoRelease } from '../src/domain/constants/go-release.constant.ts'
import { STD_ROOTS } from '../src/domain/constants/std-roots.constant.ts'
import type { GoAssetManifest } from '../src/domain/go-assets.domain-model.ts'
import { goAssetsDir, readAssetManifest } from '../src/node/go-assets.ts'
import { encodeStdPack } from '../src/std-pack/std-pack.ts'

const packageDir = join(import.meta.dirname, '..')
const outDir = goAssetsDir(packageDir)
const wasmEnv = { ...process.env, GOOS: GoRelease.GOOS, GOARCH: GoRelease.GOARCH, CGO_ENABLED: '0' }

const go = (args: ReadonlyArray<string>, env: NodeJS.ProcessEnv = process.env) =>
  execFileSync('go', args, { env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim()

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

const buildKey = async () =>
  sha256(
    new TextEncoder().encode([GoRelease.VERSION, ...STD_ROOTS, await readFile(import.meta.filename, 'utf8')].join('\n'))
  )

const checkGoVersion = () => {
  const version = go(['env', 'GOVERSION'])
  if (version !== GoRelease.VERSION) {
    throw new Error(`The Go assets are built with ${GoRelease.VERSION}, but \`go\` is ${version}.`)
  }
}

const checkWasmExec = async (goroot: string) => {
  const upstream = await readFile(join(goroot, 'lib/wasm/wasm_exec.js'))
  const vendored = await readFile(join(packageDir, 'src/wasm-exec/wasm-exec.js'))
  if (sha256(upstream) !== sha256(vendored)) {
    throw new Error(`src/wasm-exec/wasm-exec.js differs from the wasm_exec.js of ${GoRelease.VERSION}.`)
  }
}

const buildTool = (tool: 'compile' | 'link', out: string) =>
  go(['build', '-trimpath', '-ldflags=-s -w', '-o', out, `cmd/${tool}`], wasmEnv)

const buildStdPack = async () => {
  const listed = go(
    [
      'list',
      '-trimpath',
      '-gcflags=all=-dwarf=false',
      '-export',
      '-deps',
      '-f',
      '{{.ImportPath}}\t{{.Export}}',
      ...STD_ROOTS,
    ],
    wasmEnv
  )
  const archives = new Map<string, Uint8Array>()
  for (const line of listed.split('\n')) {
    const [importPath, exportFile] = line.split('\t')
    if (importPath === 'unsafe') continue
    if (importPath === undefined || exportFile === undefined || exportFile === '') {
      throw new Error(`No archive for "${line}".`)
    }
    archives.set(importPath, await readFile(exportFile))
  }
  return encodeStdPack(archives)
}

const brotli = (bytes: Uint8Array) =>
  brotliCompressSync(bytes, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: bytes.byteLength },
  })

const main = async () => {
  checkGoVersion()
  const key = await buildKey()
  const existing = existsSync(outDir) ? await readAssetManifest(packageDir).catch(() => undefined) : undefined
  if (existing?.key === key) return

  const goroot = go(['env', 'GOROOT'])
  await checkWasmExec(goroot)
  await rm(outDir, { recursive: true, force: true })
  await mkdir(outDir, { recursive: true })
  buildTool('compile', join(outDir, GoAssetFile.COMPILE))
  buildTool('link', join(outDir, GoAssetFile.LINK))
  await writeFile(join(outDir, GoAssetFile.STD), await buildStdPack())
  await copyFile(join(goroot, 'LICENSE'), join(outDir, GoAssetFile.LICENSE))

  const files: Array<GoAssetManifest['files'][number]> = []
  for (const name of Object.values(GoAssetFile)) {
    const bytes = await readFile(join(outDir, name))
    const compressed = brotli(bytes)
    await writeFile(join(outDir, `${name}${BROTLI_SUFFIX}`), compressed)
    files.push({ name, bytes: bytes.byteLength, brotliBytes: compressed.byteLength, sha256: sha256(bytes) })
  }
  const manifest: GoAssetManifest = { goVersion: GoRelease.VERSION, key, files }
  await writeFile(join(outDir, GO_ASSET_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`)
  const total = files.reduce((sum, file) => sum + file.brotliBytes, 0)
  console.log(`Go ${GoRelease.VERSION} assets written to ${outDir} (${(total / 1e6).toFixed(1)} MB in brotli).`)
}

await main()
