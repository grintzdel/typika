import type * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import { ProjectStorageError } from '../domain/errors/project-storage.error.ts'
import {
  ProjectRecordSchema,
  StoredFileSchema,
  sameOrigin,
  type ProjectFiles,
  type ProjectOrigin,
  type ProjectRecord,
  type StoredFile,
} from '../domain/project.domain-model.ts'
import { ProjectStoragePort } from '../ports/project-storage.port.ts'

const DATABASE_NAME = 'typika'
const DATABASE_VERSION = 1
const PROJECTS = 'projects'
const FILES = 'files'
const BY_TEMPLATE = 'byTemplate'
const BY_PROJECT = 'byProject'

type Stores = { readonly projects: IDBObjectStore; readonly files: IDBObjectStore }

const decodeRecord = Schema.decodeUnknownSync(ProjectRecordSchema)
const decodeRecords = Schema.decodeUnknownSync(Schema.Array(ProjectRecordSchema))
const decodeFiles = Schema.decodeUnknownSync(Schema.Array(StoredFileSchema))

const settled = <A>(request: IDBRequest<A>) =>
  new Promise<A>((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result))
    request.addEventListener('error', () => reject(request.error))
  })

const completed = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve())
    transaction.addEventListener('error', () => reject(transaction.error))
    transaction.addEventListener('abort', () => reject(transaction.error))
  })

const openDatabase = (factory: IDBFactory) =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, DATABASE_VERSION)
    request.addEventListener('upgradeneeded', (event) => {
      if (event.oldVersion < 1) {
        const projects = request.result.createObjectStore(PROJECTS, { keyPath: 'id' })
        projects.createIndex(BY_TEMPLATE, 'origin.name')
        const files = request.result.createObjectStore(FILES, { keyPath: ['projectId', 'path'] })
        files.createIndex(BY_PROJECT, 'projectId')
      }
    })
    request.addEventListener('success', () => {
      const database = request.result
      database.addEventListener('versionchange', () => database.close())
      resolve(database)
    })
    request.addEventListener('error', () => reject(request.error))
  })

const inTransaction = async <A>(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  body: (stores: Stores) => Promise<A>
): Promise<A> => {
  const transaction = database.transaction([PROJECTS, FILES], mode)
  const done = completed(transaction)
  done.catch(() => undefined)
  try {
    const result = await body({ projects: transaction.objectStore(PROJECTS), files: transaction.objectStore(FILES) })
    await done
    return result
  } catch (error) {
    if (transaction.error === null) transaction.abort()
    throw error
  }
}

const latestProjectOf = async (projects: IDBObjectStore, origin: ProjectOrigin) =>
  decodeRecords(await settled(projects.index(BY_TEMPLATE).getAll(origin.name)))
    .filter((record) => sameOrigin(record.origin, origin))
    .reduce<ProjectRecord | undefined>(
      (latest, record) => (latest === undefined || record.updatedAt > latest.updatedAt ? record : latest),
      undefined
    )

const findRecord = async (projects: IDBObjectStore, id: string) => {
  const found: unknown = await settled(projects.get(id))
  return found === undefined ? undefined : decodeRecord(found)
}

const filesOf = async (files: IDBObjectStore, projectId: string): Promise<ProjectFiles> =>
  new Map(
    decodeFiles(await settled(files.index(BY_PROJECT).getAll(projectId))).map((file) => [file.path, file.content])
  )

const putFiles = (files: IDBObjectStore, projectId: string, contents: ProjectFiles, updatedAt: number) => {
  for (const [path, content] of contents) files.put({ projectId, path, content, updatedAt } satisfies StoredFile)
}

const requestPersistence = () => {
  if ('storage' in navigator) navigator.storage.persist().catch(() => false)
}

export const makeProjectStorageIndexedDb = (factory: IDBFactory): Context.Service.Shape<typeof ProjectStoragePort> => {
  let database: Promise<IDBDatabase> | undefined

  const connect = () => {
    if (database !== undefined) return database
    const opening = openDatabase(factory)
    database = opening
    opening.catch(() => {
      if (database === opening) database = undefined
    })
    return opening
  }

  const transact = <A>(mode: IDBTransactionMode, body: (stores: Stores) => Promise<A>) =>
    Effect.tryPromise({
      try: async () => inTransaction(await connect(), mode, body),
      catch: (cause) => new ProjectStorageError({ cause }),
    })

  return {
    list: transact('readonly', async ({ projects }) =>
      decodeRecords(await settled(projects.getAll())).toSorted((a, b) => b.updatedAt - a.updatedAt)
    ),

    findById: (id) =>
      transact('readonly', async ({ projects, files }) => {
        const record = await findRecord(projects, id)
        return record === undefined ? Option.none() : Option.some({ record, files: await filesOf(files, record.id) })
      }),

    findByOrigin: (origin) =>
      transact('readonly', async ({ projects, files }) => {
        const record = await latestProjectOf(projects, origin)
        return record === undefined ? Option.none() : Option.some({ record, files: await filesOf(files, record.id) })
      }),

    saveTemplateEdits: ({ project, templateFiles, edits, match = 'origin' }) =>
      transact('readwrite', async ({ projects, files }) => {
        const existing =
          match === 'id' ? await findRecord(projects, project.id) : await latestProjectOf(projects, project.origin)
        const record = existing === undefined ? project : { ...existing, updatedAt: project.updatedAt }
        if (existing === undefined) {
          putFiles(files, record.id, templateFiles, record.createdAt)
          requestPersistence()
        }
        projects.put(record)
        putFiles(files, record.id, edits, record.updatedAt)
        return { record, files: await filesOf(files, record.id) }
      }),

    replaceFiles: (projectId, contents, updatedAt) =>
      transact('readwrite', async ({ projects, files }) => {
        const found = await findRecord(projects, projectId)
        for (const key of await settled(files.index(BY_PROJECT).getAllKeys(projectId))) files.delete(key)
        putFiles(files, projectId, contents, updatedAt)
        if (found !== undefined) projects.put({ ...found, updatedAt })
      }),

    duplicate: (sourceId, copy) =>
      transact('readwrite', async ({ projects, files }) => {
        if ((await findRecord(projects, sourceId)) === undefined) return Option.none()
        const copied = await filesOf(files, sourceId)
        projects.put(copy)
        putFiles(files, copy.id, copied, copy.updatedAt)
        requestPersistence()
        return Option.some({ record: copy, files: copied })
      }),

    rename: (id, name) =>
      transact('readwrite', async ({ projects }) => {
        const found = await findRecord(projects, id)
        if (found !== undefined) projects.put({ ...found, name })
      }),

    remove: (id) =>
      transact('readwrite', async ({ projects, files }) => {
        for (const key of await settled(files.index(BY_PROJECT).getAllKeys(id))) files.delete(key)
        projects.delete(id)
      }),
  }
}

export const ProjectStorageIndexedDbLayer = Layer.sync(ProjectStoragePort, () =>
  makeProjectStorageIndexedDb(globalThis.indexedDB)
)
