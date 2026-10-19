import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Option from 'effect/Option'
import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'

import { projectFiles, projectRecord } from '../../__tests__/project.factory.ts'
import { makeProjectStorageIndexedDb } from './project-storage.indexeddb.adapter.ts'

const TEMPLATE = projectFiles({ 'src/a.ts': 'a', 'src/b.ts': 'b' })
const SAMPLE = { kind: 'template', name: 'sample-ts' } as const

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect)

const filesOf = (stored: Option.Option<{ readonly files: ReadonlyMap<string, string> }>) =>
  Object.fromEntries(Option.getOrThrow(stored).files)

describe('makeProjectStorageIndexedDb', () => {
  it('finds no project for a template never edited', async () => {
    const storage = makeProjectStorageIndexedDb(new IDBFactory())

    expect(Option.isNone(await run(storage.findByOrigin(SAMPLE)))).toBe(true)
  })

  it('creates the project from the template files on the first save', async () => {
    const storage = makeProjectStorageIndexedDb(new IDBFactory())
    const record = projectRecord()

    const saved = await run(
      storage.saveTemplateEdits({ project: record, templateFiles: TEMPLATE, edits: projectFiles({ 'src/a.ts': 'A' }) })
    )

    expect(saved.record).toEqual(record)
    expect(Object.fromEntries(saved.files)).toEqual({ 'src/a.ts': 'A', 'src/b.ts': 'b' })
    expect(filesOf(await run(storage.findByOrigin(SAMPLE)))).toEqual({ 'src/a.ts': 'A', 'src/b.ts': 'b' })
  })

  it('applies later edits to the existing project', async () => {
    const storage = makeProjectStorageIndexedDb(new IDBFactory())
    const first = projectRecord()
    await run(
      storage.saveTemplateEdits({ project: first, templateFiles: TEMPLATE, edits: projectFiles({ 'src/a.ts': 'A' }) })
    )

    const saved = await run(
      storage.saveTemplateEdits({
        project: projectRecord({ updatedAt: 2_000 }),
        templateFiles: TEMPLATE,
        edits: projectFiles({ 'src/b.ts': 'B' }),
      })
    )

    expect(saved.record).toEqual({ ...first, updatedAt: 2_000 })
    expect(Object.fromEntries(saved.files)).toEqual({ 'src/a.ts': 'A', 'src/b.ts': 'B' })
  })

  it('creates a single project when two saves race', async () => {
    const storage = makeProjectStorageIndexedDb(new IDBFactory())

    await Promise.all([
      run(
        storage.saveTemplateEdits({
          project: projectRecord(),
          templateFiles: TEMPLATE,
          edits: projectFiles({ 'src/a.ts': 'A' }),
        })
      ),
      run(
        storage.saveTemplateEdits({
          project: projectRecord(),
          templateFiles: TEMPLATE,
          edits: projectFiles({ 'src/b.ts': 'B' }),
        })
      ),
    ])

    expect(filesOf(await run(storage.findByOrigin(SAMPLE)))).toEqual({ 'src/a.ts': 'A', 'src/b.ts': 'B' })
  })

  it('keeps the projects of each template apart', async () => {
    const storage = makeProjectStorageIndexedDb(new IDBFactory())
    await run(
      storage.saveTemplateEdits({
        project: projectRecord({ origin: { kind: 'template', name: 'other-ts' } }),
        templateFiles: TEMPLATE,
        edits: projectFiles({ 'src/a.ts': 'other' }),
      })
    )

    expect(Option.isNone(await run(storage.findByOrigin(SAMPLE)))).toBe(true)
  })

  it('keeps the exercise projects apart from the template project', async () => {
    const storage = makeProjectStorageIndexedDb(new IDBFactory())
    const exercise = { kind: 'exercise', name: 'sample-ts', exercise: 'fix-it' } as const
    await run(
      storage.saveTemplateEdits({
        project: projectRecord({ origin: exercise }),
        templateFiles: TEMPLATE,
        edits: projectFiles({ 'src/a.ts': 'exercise' }),
      })
    )

    expect(Option.isNone(await run(storage.findByOrigin(SAMPLE)))).toBe(true)
    expect(filesOf(await run(storage.findByOrigin(exercise)))).toEqual({ 'src/a.ts': 'exercise', 'src/b.ts': 'b' })
  })

  it('replaces every file of a project', async () => {
    const storage = makeProjectStorageIndexedDb(new IDBFactory())
    const record = projectRecord()
    await run(
      storage.saveTemplateEdits({
        project: record,
        templateFiles: TEMPLATE,
        edits: projectFiles({ 'src/extra.ts': 'x' }),
      })
    )

    await run(storage.replaceFiles(record.id, TEMPLATE, 3_000))

    const stored = Option.getOrThrow(await run(storage.findByOrigin(SAMPLE)))
    expect(Object.fromEntries(stored.files)).toEqual({ 'src/a.ts': 'a', 'src/b.ts': 'b' })
    expect(stored.record.updatedAt).toBe(3_000)
  })

  it('keeps the projects in the database across connections', async () => {
    const factory = new IDBFactory()
    await run(
      makeProjectStorageIndexedDb(factory).saveTemplateEdits({
        project: projectRecord(),
        templateFiles: TEMPLATE,
        edits: projectFiles({ 'src/a.ts': 'A' }),
      })
    )

    const reopened = await run(makeProjectStorageIndexedDb(factory).findByOrigin(SAMPLE))

    expect(filesOf(reopened)).toEqual({ 'src/a.ts': 'A', 'src/b.ts': 'b' })
  })

  it('lists every project, most recently edited first', async () => {
    const storage = makeProjectStorageIndexedDb(new IDBFactory())
    const projects = [
      projectRecord({ name: 'a-ts', origin: { kind: 'template', name: 'a-ts' }, updatedAt: 3_000 }),
      projectRecord({ name: 'b-ts', origin: { kind: 'template', name: 'b-ts' }, updatedAt: 1_000 }),
      projectRecord({ name: 'c-ts', origin: { kind: 'template', name: 'c-ts' }, updatedAt: 2_000 }),
    ]
    await Promise.all(
      projects.map((project) =>
        run(storage.saveTemplateEdits({ project, templateFiles: TEMPLATE, edits: projectFiles({}) }))
      )
    )

    const listed = await run(storage.list)

    expect(listed.map((record) => record.name)).toEqual(['a-ts', 'c-ts', 'b-ts'])
  })

  it('finds a project by its id', async () => {
    const storage = makeProjectStorageIndexedDb(new IDBFactory())
    const record = projectRecord()
    await run(
      storage.saveTemplateEdits({ project: record, templateFiles: TEMPLATE, edits: projectFiles({ 'src/a.ts': 'A' }) })
    )

    const found = Option.getOrThrow(await run(storage.findById(record.id)))

    expect(found.record).toEqual(record)
    expect(Object.fromEntries(found.files)).toEqual({ 'src/a.ts': 'A', 'src/b.ts': 'b' })
    expect(Option.isNone(await run(storage.findById('missing')))).toBe(true)
  })

  it('saves the edits of a project matched by id, even when another one of its template is newer', async () => {
    const storage = makeProjectStorageIndexedDb(new IDBFactory())
    const older = projectRecord({ updatedAt: 1_000 })
    await run(storage.saveTemplateEdits({ project: older, templateFiles: TEMPLATE, edits: new Map() }))
    const newer = Option.getOrThrow(
      await run(storage.duplicate(older.id, projectRecord({ name: 'copy', createdAt: 2_000, updatedAt: 2_000 })))
    )

    await run(
      storage.saveTemplateEdits({
        project: { ...older, updatedAt: 3_000 },
        templateFiles: TEMPLATE,
        edits: projectFiles({ 'src/a.ts': 'older' }),
        match: 'id',
      })
    )

    expect(filesOf(await run(storage.findById(older.id)))).toEqual({ 'src/a.ts': 'older', 'src/b.ts': 'b' })
    expect(filesOf(await run(storage.findById(newer.record.id)))).toEqual({ 'src/a.ts': 'a', 'src/b.ts': 'b' })
  })

  it('duplicates a project with its files under a new record', async () => {
    const storage = makeProjectStorageIndexedDb(new IDBFactory())
    const source = projectRecord()
    await run(
      storage.saveTemplateEdits({ project: source, templateFiles: TEMPLATE, edits: projectFiles({ 'src/a.ts': 'A' }) })
    )
    const copy = projectRecord({ name: 'sample-ts (copy)', createdAt: 2_000, updatedAt: 2_000 })

    const duplicated = Option.getOrThrow(await run(storage.duplicate(source.id, copy)))

    expect(duplicated.record).toEqual(copy)
    expect(filesOf(await run(storage.findById(copy.id)))).toEqual({ 'src/a.ts': 'A', 'src/b.ts': 'b' })
    expect(filesOf(await run(storage.findByOrigin(SAMPLE)))).toEqual({ 'src/a.ts': 'A', 'src/b.ts': 'b' })
    expect(Option.isNone(await run(storage.duplicate('missing', projectRecord())))).toBe(true)
  })

  it('renames a project', async () => {
    const storage = makeProjectStorageIndexedDb(new IDBFactory())
    const record = projectRecord()
    await run(storage.saveTemplateEdits({ project: record, templateFiles: TEMPLATE, edits: new Map() }))

    await run(storage.rename(record.id, 'My pricing'))

    expect(Option.getOrThrow(await run(storage.findById(record.id))).record).toEqual({ ...record, name: 'My pricing' })
  })

  it('removes a project and its files', async () => {
    const factory = new IDBFactory()
    const storage = makeProjectStorageIndexedDb(factory)
    const removed = projectRecord()
    const kept = projectRecord({ origin: { kind: 'template', name: 'other-ts' } })
    await run(storage.saveTemplateEdits({ project: removed, templateFiles: TEMPLATE, edits: new Map() }))
    await run(storage.saveTemplateEdits({ project: kept, templateFiles: TEMPLATE, edits: new Map() }))

    await run(storage.remove(removed.id))

    expect(Option.isNone(await run(storage.findById(removed.id)))).toBe(true)
    expect((await run(storage.list)).map((record) => record.id)).toEqual([kept.id])
    const files = await new Promise<number>((resolve, reject) => {
      const request = factory.open('typika')
      request.addEventListener('success', () => {
        const count = request.result.transaction('files').objectStore('files').count()
        count.addEventListener('success', () => {
          request.result.close()
          resolve(count.result)
        })
        count.addEventListener('error', () => reject(count.error))
      })
    })
    expect(files).toBe(TEMPLATE.size)
  })

  it('fails with a storage error on a record it cannot read', async () => {
    const factory = new IDBFactory()
    const storage = makeProjectStorageIndexedDb(factory)
    await run(storage.saveTemplateEdits({ project: projectRecord(), templateFiles: TEMPLATE, edits: new Map() }))
    await new Promise<void>((resolve, reject) => {
      const request = factory.open('typika')
      request.addEventListener('success', () => {
        const transaction = request.result.transaction('projects', 'readwrite')
        transaction.objectStore('projects').put({ id: 'broken', origin: { kind: 'template', name: 'sample-ts' } })
        transaction.addEventListener('complete', () => {
          request.result.close()
          resolve()
        })
        transaction.addEventListener('error', () => reject(transaction.error))
      })
    })

    const exit = await Effect.runPromiseExit(storage.findByOrigin(SAMPLE))

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({ error: { _tag: 'ProjectStorageError' } })
  })
})
