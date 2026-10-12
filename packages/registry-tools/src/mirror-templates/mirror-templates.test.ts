import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it } from 'vitest'

import { RefUnresolvableError } from '../domain/errors/ref-unresolvable.error.ts'
import type { ResolveRef } from '../resolve-ref/resolve-ref.ts'
import { mirrorTemplates } from './mirror-templates.ts'

const TEMPLATES: Readonly<Record<string, ReadonlyMap<string, string | Uint8Array>>> = {
  'strategy/ts@0123456789ab': new Map([
    ['typika.toml', 'name = "strategy-ts"\n'],
    ['src/main.ts', 'main\n'],
  ]),
  'strategy-base/ts@0123456789ab': new Map([['typika.toml', 'name = "strategy-base-ts"\n']]),
  'observer/ts@ba9876543210': new Map<string, string | Uint8Array>([['diagram.png', new Uint8Array([0x89, 0, 1])]]),
}

const resolve: ResolveRef = ({ path, ref }) => {
  const files = TEMPLATES[`${path ?? ''}@${ref}`]
  return files === undefined ? Effect.fail(new RefUnresolvableError({ reason: 'missing' })) : Effect.succeed(files)
}

const mirror = (refs: ReadonlyArray<string>) =>
  Effect.runPromise(
    mirrorTemplates(
      refs.map((ref) => ({ ref })),
      resolve
    )
  )

describe('mirrorTemplates', () => {
  it('lays out each file under its repository at the pinned commit, as jsDelivr serves it', async () => {
    const files = await mirror(['github:typika/templates/strategy/ts@0123456789ab'])

    expect(files).toContainEqual({
      path: 'gh/typika/templates@0123456789ab/strategy/ts/src/main.ts',
      content: 'main\n',
    })
  })

  it('lists the mirrored files of each repository at each commit, in the jsDelivr flat format', async () => {
    const files = await mirror([
      'github:typika/templates/strategy/ts@0123456789ab',
      'github:typika/templates/strategy-base/ts@0123456789ab',
      'github:typika/templates/observer/ts@ba9876543210',
    ])
    const listing = (ref: string): unknown =>
      JSON.parse(String(files.find((file) => file.path === `listing/gh/typika/templates@${ref}.json`)?.content))

    expect(listing('0123456789ab')).toMatchObject({
      type: 'gh',
      name: 'typika/templates',
      version: '0123456789ab',
      files: [
        { name: '/strategy-base/ts/typika.toml', size: 26 },
        { name: '/strategy/ts/src/main.ts', size: 5 },
        { name: '/strategy/ts/typika.toml', size: 21 },
      ],
    })
    expect(listing('ba9876543210')).toMatchObject({ files: [{ name: '/observer/ts/diagram.png', size: 3 }] })
  })

  it('refuses a ref that is not pinned', async () => {
    const exit = await Effect.runPromiseExit(mirrorTemplates([{ ref: 'github:typika/templates/strategy/ts' }], resolve))

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({ error: { _tag: 'RefUnresolvableError' } })
  })
})
