import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it } from 'vitest'

import { projectFiles } from '../../__tests__/project.factory.ts'
import {
  applyShareDelta,
  decodeSharePayload,
  encodeSharePayload,
  MAX_SHARE_URL_LENGTH,
  shareDeltaOf,
  shareLinkOf,
  shareProjectIdOf,
  type SharePayload,
} from './share-link.domain-model.ts'

const ORIGIN = 'github:typika/templates/strategy/ts@3f2c9a1e7b4d'

const PAYLOAD: SharePayload = {
  n: 'strategy-ts',
  o: ORIGIN,
  r: 'browser-js',
  d: { 'src/main.ts': 'edited', 'src/old.ts': null },
}

const decode = (text: string) => Effect.runPromiseExit(decodeSharePayload(text))

describe('share delta', () => {
  it('keeps the files changed or added, and marks the deleted ones', () => {
    const template = projectFiles({ 'src/a.ts': 'a', 'src/b.ts': 'b', 'src/c.ts': 'c' })
    const current = projectFiles({ 'src/a.ts': 'a', 'src/b.ts': 'B', 'src/d.ts': 'd' })

    expect(shareDeltaOf(template, current)).toEqual({ 'src/b.ts': 'B', 'src/c.ts': null, 'src/d.ts': 'd' })
  })

  it('rebuilds the files from the template and the delta', () => {
    const template = projectFiles({ 'src/a.ts': 'a', 'src/c.ts': 'c' })

    const rebuilt = applyShareDelta(template, { 'src/b.ts': 'b', 'src/c.ts': null })

    expect(Object.fromEntries(rebuilt)).toEqual({ 'src/a.ts': 'a', 'src/b.ts': 'b' })
  })

  it('ignores a delta path that is not a project path', () => {
    const rebuilt = applyShareDelta(projectFiles({}), { '../escape.ts': 'x', 'src/ok.ts': 'ok' })

    expect([...rebuilt.keys()]).toEqual(['src/ok.ts'])
  })
})

describe('share payload', () => {
  it('reads back what it wrote, behind its version', async () => {
    const encoded = await Effect.runPromise(encodeSharePayload(PAYLOAD))

    expect(encoded).toMatch(/^1\.[\w-]+$/)
    const exit = await decode(encoded)
    expect(Exit.isSuccess(exit) && exit.value).toEqual(PAYLOAD)
  })

  it('keeps the exercise of an exercise project', async () => {
    const payload = { ...PAYLOAD, x: 'implement-express' }

    const exit = await decode(await Effect.runPromise(encodeSharePayload(payload)))

    expect(Exit.isSuccess(exit) && exit.value.x).toBe('implement-express')
  })

  it('compresses a large unchanged region', async () => {
    const encoded = await Effect.runPromise(
      encodeSharePayload({ ...PAYLOAD, d: { 'src/main.ts': 'x'.repeat(50_000) } })
    )

    expect(encoded.length).toBeLessThan(1_000)
  })

  it('tells a link from a newer version of Typika', async () => {
    const exit = await decode('2.abc')

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({
      error: { _tag: 'ShareLinkInvalidError', reason: 'newer' },
    })
  })

  it.each(['', '1', '1.', '1.not-deflate', 'x.abc', `1.${btoa('{}')}`])(
    'rejects the malformed payload %j',
    async (text) => {
      const exit = await decode(text)

      expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({
        error: { _tag: 'ShareLinkInvalidError', reason: 'invalid' },
      })
    }
  )

  it('rejects a payload without any files', async () => {
    const encoded = await Effect.runPromise(encodeSharePayload({ n: 'x', o: ORIGIN, r: 'browser-js' }))

    expect(Exit.isFailure(await decode(encoded))).toBe(true)
  })
})

describe('share link', () => {
  it('puts the payload in the fragment of /s', () => {
    expect(shareLinkOf('https://typika.dev', '1.abc')).toEqual({ _tag: 'Ready', url: 'https://typika.dev/s#1.abc' })
  })

  it('refuses a link longer than the limit', () => {
    const encoded = `1.${'a'.repeat(MAX_SHARE_URL_LENGTH)}`

    expect(shareLinkOf('https://typika.dev', encoded)).toEqual({
      _tag: 'TooLong',
      length: 'https://typika.dev/s#'.length + encoded.length,
      max: MAX_SHARE_URL_LENGTH,
    })
  })

  it('gives the same project id to the same payload, and another to another payload', async () => {
    const first = await Effect.runPromise(shareProjectIdOf('1.abc'))

    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(await Effect.runPromise(shareProjectIdOf('1.abc'))).toBe(first)
    expect(await Effect.runPromise(shareProjectIdOf('1.abd'))).not.toBe(first)
  })
})
