import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { KotlinCompilationSchema, type KotlinCompilation } from '@typika/runtime-kotlin'
import * as Schema from 'effect/Schema'
import { describe, expect, it } from 'vitest'

import { KOTLIN_ARTIFACTS_DIR, readKotlinArtifactKeys, writeKotlinArtifacts } from './write-kotlin-artifacts.ts'

const compiled = (code: string): KotlinCompilation => ({
  _tag: 'Compiled',
  artifact: { kind: 'js', code, sourceMap: '{"version":3}' },
  diagnostics: [],
})

const registry = () => mkdtemp(join(tmpdir(), 'typika-kotlin-artifacts-'))

describe('writeKotlinArtifacts', () => {
  it('reads no keys from a registry that has no artifacts', async () => {
    expect((await readKotlinArtifactKeys(await registry())).size).toBe(0)
  })

  it('writes each compilation under its key, as the compile cache stores it', async () => {
    const root = await registry()

    await writeKotlinArtifacts(root, ['a1'], [{ key: 'a1', compilation: compiled('main()') }])

    const stored: unknown = JSON.parse(await readFile(join(root, KOTLIN_ARTIFACTS_DIR, 'a1.json'), 'utf8'))
    expect(Schema.decodeUnknownSync(KotlinCompilationSchema)(stored)).toEqual(compiled('main()'))
    expect([...(await readKotlinArtifactKeys(root))]).toEqual(['a1'])
  })

  it('removes the artifacts that no template asks for any more', async () => {
    const root = await registry()
    await writeKotlinArtifacts(
      root,
      ['a1', 'b2'],
      [
        { key: 'a1', compilation: compiled('old()') },
        { key: 'b2', compilation: compiled('kept()') },
      ]
    )

    const result = await writeKotlinArtifacts(root, ['b2', 'c3'], [{ key: 'c3', compilation: compiled('new()') }])

    expect(result).toEqual({ written: 1, removed: ['a1'] })
    expect([...(await readKotlinArtifactKeys(root))].toSorted()).toEqual(['b2', 'c3'])
  })

  it('leaves an artifact that is still asked for untouched when it is not rewritten', async () => {
    const root = await registry()
    await writeKotlinArtifacts(root, ['a1'], [{ key: 'a1', compilation: compiled('first()') }])
    const before = await readFile(join(root, KOTLIN_ARTIFACTS_DIR, 'a1.json'), 'utf8')

    await writeKotlinArtifacts(root, ['a1', 'b2'], [{ key: 'b2', compilation: compiled('other()') }])

    expect(await readFile(join(root, KOTLIN_ARTIFACTS_DIR, 'a1.json'), 'utf8')).toBe(before)
  })
})
