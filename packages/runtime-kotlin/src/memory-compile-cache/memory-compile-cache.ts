import { compilationSize } from '../compilation-size/compilation-size.ts'
import type { CompileCache } from '../domain/compile-cache.port.ts'
import type { KotlinCompilation } from '../domain/compile-protocol.domain-model.ts'

export const makeMemoryCompileCache = (maxBytes: number): CompileCache => {
  const entries = new Map<string, { readonly compilation: KotlinCompilation; readonly size: number }>()
  let total = 0

  return {
    get: async (key) => {
      const entry = entries.get(key)
      if (entry === undefined) return undefined
      entries.delete(key)
      entries.set(key, entry)
      return entry.compilation
    },
    set: async (key, compilation) => {
      const previous = entries.get(key)
      if (previous !== undefined) {
        entries.delete(key)
        total -= previous.size
      }
      const size = compilationSize(compilation)
      if (size > maxBytes) return
      entries.set(key, { compilation, size })
      total += size
      for (const [oldest, entry] of entries) {
        if (total <= maxBytes) break
        entries.delete(oldest)
        total -= entry.size
      }
    },
  }
}
