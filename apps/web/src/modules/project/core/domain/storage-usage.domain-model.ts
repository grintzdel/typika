export type StorageEstimate = { readonly usage: number; readonly quota: number }

export type StorageUsage = StorageEstimate & { readonly isNearlyFull: boolean }

const NEARLY_FULL = 0.8

const encoder = new TextEncoder()

export const byteSizeOf = (contents: Iterable<string>) => {
  let total = 0
  for (const content of contents) total += encoder.encode(content).byteLength
  return total
}

// The browser estimate counts the whole origin on disk, and IndexedDB only reclaims deleted rows when it compacts,
// so the usage shown is the projects' own size while the warning stays on the browser's figure.
export const storageUsageOf = (projectsSize: number, { usage, quota }: StorageEstimate): StorageUsage | undefined =>
  quota > 0 ? { usage: projectsSize, quota, isNearlyFull: usage / quota >= NEARLY_FULL } : undefined
