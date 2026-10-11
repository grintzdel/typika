import * as Duration from 'effect/Duration'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as AsyncResult from 'effect/reactivity/AsyncResult'
import * as Atom from 'effect/reactivity/Atom'
import * as AtomRegistry from 'effect/reactivity/AtomRegistry'
import { describe, expect, it } from 'vitest'

import { appRuntime } from '../../../app/core/app.runtime.ts'
import { makeLanguageServiceInMemory } from '../../../editor/core/editor.test-layer.ts'
import { makeExerciseProgressInMemory } from '../../../exercise/core/exercise.test-layer.ts'
import { templateFiles } from '../../../project/__tests__/template.factory.ts'
import { resetProjectAtom, templateProjectAtom } from '../../../project/core/atoms/project.atoms.ts'
import { makeProjectTestLayer } from '../../../project/core/project.test-layer.ts'
import { makeFakeRuntime, projectPath } from '../../__tests__/runtime.factory.ts'
import { makeRuntimeTestLayer } from '../runtime.test-layer.ts'
import { runProjectAtom, runtimeSessionAtom, testProjectAtom, writeProjectFilesAtom } from './runtime.atoms.ts'

const makeRegistry = (bootDelay = Duration.zero) => {
  const fake = makeFakeRuntime()
  const layer = Layer.mergeAll(
    makeProjectTestLayer({ 'sample-ts': templateFiles() }),
    makeRuntimeTestLayer({ ...fake.port, boot: (snapshot) => Effect.delay(fake.port.boot(snapshot), bootDelay) }),
    makeLanguageServiceInMemory().layer,
    makeExerciseProgressInMemory().layer
  )
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

  it('runs on the new session of a reset project, not on the one it replaces', async () => {
    const { registry } = makeRegistry(Duration.millis(20))
    registry.mount(runtimeSessionAtom('sample-ts'))
    registry.mount(writeProjectFilesAtom('sample-ts'))
    registry.mount(resetProjectAtom('sample-ts'))
    registry.mount(runProjectAtom('sample-ts'))
    await settled(registry, runtimeSessionAtom('sample-ts'))
    registry.set(writeProjectFilesAtom('sample-ts'), [[projectPath('src/main.ts'), 'edited']])
    await settled(registry, writeProjectFilesAtom('sample-ts'))

    registry.set(resetProjectAtom('sample-ts'), undefined)
    await settled(registry, resetProjectAtom('sample-ts'))
    await settled(registry, runtimeSessionAtom('sample-ts'))
    await settled(registry, writeProjectFilesAtom('sample-ts'))
    registry.set(runProjectAtom('sample-ts'), [])

    expect(await settled(registry, runProjectAtom('sample-ts'))).toMatchObject({
      entries: [{ stream: 'stdout', text: "console.log('hello')\n" }],
    })
  })

  it('drops a write asked before a reset once the next session is up', async () => {
    const { registry } = makeRegistry(Duration.millis(20))
    registry.mount(runtimeSessionAtom('sample-ts'))
    registry.mount(writeProjectFilesAtom('sample-ts'))
    registry.mount(resetProjectAtom('sample-ts'))
    registry.mount(runProjectAtom('sample-ts'))
    await settled(registry, templateProjectAtom('sample-ts'))

    registry.set(writeProjectFilesAtom('sample-ts'), [[projectPath('src/main.ts'), 'edited']])
    registry.set(resetProjectAtom('sample-ts'), undefined)
    await settled(registry, resetProjectAtom('sample-ts'))
    await settled(registry, runtimeSessionAtom('sample-ts'))
    await settled(registry, writeProjectFilesAtom('sample-ts'))
    registry.set(runProjectAtom('sample-ts'), [])

    expect(await settled(registry, runProjectAtom('sample-ts'))).toMatchObject({
      entries: [{ stream: 'stdout', text: "console.log('hello')\n" }],
    })
  })
})
