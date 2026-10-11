export type PackagingPolicy = {
  readonly materials: readonly string[]
}

export const noPackaging: PackagingPolicy = { materials: [] }

export const cardboardBox: PackagingPolicy = { materials: ['cardboard box'] }

export const insulatedBox: PackagingPolicy = { materials: ['insulated box'] }
