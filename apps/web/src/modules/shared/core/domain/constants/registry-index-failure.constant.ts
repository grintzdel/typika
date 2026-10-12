export const RegistryIndexFailure = {
  NETWORK: 'network',
  INVALID: 'invalid',
  UNSUPPORTED: 'unsupported',
} as const

export type RegistryIndexFailure = (typeof RegistryIndexFailure)[keyof typeof RegistryIndexFailure]
