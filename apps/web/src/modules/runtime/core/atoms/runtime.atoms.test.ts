import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as AsyncResult from 'effect/reactivity/AsyncResult'
import * as Atom from 'effect/reactivity/Atom'
import * as AtomRegistry from 'effect/reactivity/AtomRegistry'
import { describe, expect, it } from 'vitest'

import { appRuntime } from '../../../app/core/app.runtime.ts'
import { templateFiles } from '../../../project/__tests__/template.factory.ts'
import { makeProjectTestLayer } from '../../../project/core/project.test-layer.ts'
import { makeFakeRuntime, projectPath } from '../../__tests__/runtime.factory.ts'
import { makeRuntimeTestLayer } from '../runtime.test-layer.ts'
import { runProjectAtom, runtimeSessionAtom, testProjectAtom } from './runtime.atoms.ts'

const makeRegistry = () => {
  const fake = makeFakeRuntime()
  const layer = Layer.mergeAll(makeProjectTestLayer({ 'sample-ts': templateFiles() }), makeRuntimeTestLayer(fake.port))
  const registry = AtomRegistry.make({ initialValues: [Atom.initialValue(appRuntime.layer, layer)] })
  return { registry, journal: fake.journal }
}

const settled = <A, E>(registry: AtomRegistry.AtomRegistry, atom: Atom.Atom<AsyncResult.AsyncResult<A, E>>) =>
  Effect.runPromise(AtomRegistry.getResult(registry, atom, { suspendOnWaiting: true }))

describe('runtime atoms', () => {
  it('boots a session for the template', async () => {
    const { registry, journal } = makeRegistry()
    registry.mount(runtimeSessionAtom('sample-ts'))

    await settled(registry, runtimeSessionAtom('sample-ts'))

    expect(journal).toEqual(['booted'])
  })

  it('runs the entry with the pending writes', async () => {
    const { registry } = makeRegistry()
    registry.mount(runtimeSessionAtom('sample-ts'))
    registry.mount(runProjectAtom('sample-ts'))

    registry.set(runProjectAtom('sample-ts'), [[projectPath('src/main.ts'), 'edited']])

    expect(await settled(registry, runProjectAtom('sample-ts'))).toMatchObject({
      entries: [{ stream: 'stdout', text: 'edited' }],
      outcome: { _tag: 'Exited', code: 0 },
    })
  })

  it('runs the tests', async () => {
    const { registry } = makeRegistry()
    registry.mount(runtimeSessionAtom('sample-ts'))
    registry.mount(testProjectAtom('sample-ts'))

    registry.set(testProjectAtom('sample-ts'), [])

    expect(await settled(registry, testProjectAtom('sample-ts'))).toMatchObject({
      outcome: { _tag: 'Finished', status: 'passed' },
    })
  })
})
