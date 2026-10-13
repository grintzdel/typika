import { compilationSize } from '../compilation-size/compilation-size.ts'
import type { CompileCache } from '../domain/compile-cache.port.ts'
import type { KotlinCompilation } from '../domain/compile-protocol.domain-model.ts'

export type IndexedDbCompileCacheOptions = {
  readonly databaseName?: string
  readonly maxBytes: number
}

type Entry = {
  readonly key: string
  readonly compilation: KotlinCompilation
  readonly size: number
  readonly usedAt: number
}

const DEFAULT_DATABASE = 'typika-kotlin-compilations'
const STORE = 'compilations'
const USED_AT = 'usedAt'

const settle = <A>(request: IDBRequest<A>) =>
  new Promise<A>((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result))
    request.addEventListener('error', () => reject(request.error))
  })

const completion = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve())
    transaction.addEventListener('error', () => reject(transaction.error))
    transaction.addEventListener('abort', () => reject(transaction.error))
  })

const open = (name: string) => {
  const request = indexedDB.open(name, 1)
  request.addEventListener('upgradeneeded', () => {
    request.result.createObjectStore(STORE, { keyPath: 'key' }).createIndex(USED_AT, USED_AT)
  })
  return settle(request)
}

const isEntry = (value: unknown): value is Entry =>
  typeof value === 'object' && value !== null && 'key' in value && 'compilation' in value && 'size' in value

export const makeIndexedDbCompileCache = ({
  databaseName = DEFAULT_DATABASE,
  maxBytes,
}: IndexedDbCompileCacheOptions): CompileCache => {
  let database: Promise<IDBDatabase> | undefined
  let clock = 0
  const tick = () => (clock = Math.max(clock + 1, Date.now() * 1_000))
  const db = () => (database ??= open(databaseName))

  const evict = async (store: IDBObjectStore) => {
    const entries = (await settle(store.index(USED_AT).getAll())).filter(isEntry)
    let total = entries.reduce((sum, entry) => sum + entry.size, 0)
    for (const entry of entries) {
      if (total <= maxBytes) break
      store.delete(entry.key)
      total -= entry.size
    }
  }

  return {
    get: async (key) => {
      const transaction = (await db()).transaction(STORE, 'readwrite')
      const store = transaction.objectStore(STORE)
      const found: unknown = await settle(store.get(key))
      if (!isEntry(found)) return undefined
      store.put({ ...found, usedAt: tick() } satisfies Entry)
      await completion(transaction)
      return found.compilation
    },
    set: async (key, compilation) => {
      const size = compilationSize(compilation)
      if (size > maxBytes) return
      const transaction = (await db()).transaction(STORE, 'readwrite')
      const store = transaction.objectStore(STORE)
      store.put({ key, compilation, size, usedAt: tick() } satisfies Entry)
      await evict(store)
      await completion(transaction)
    },
  }
}
