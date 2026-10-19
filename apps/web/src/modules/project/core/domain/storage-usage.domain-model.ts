export type StorageEstimate = { readonly usage: number; readonly quota: number }

export type StorageUsage = StorageEstimate & { readonly isNearlyFull: boolean }

const NEARLY_FULL = 0.8

export const storageUsageOf = ({ usage, quota }: StorageEstimate): StorageUsage | undefined =>
  quota > 0 ? { usage, quota, isNearlyFull: usage / quota >= NEARLY_FULL } : undefined
