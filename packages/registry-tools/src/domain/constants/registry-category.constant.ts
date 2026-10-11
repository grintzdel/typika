export const RegistryCategory = {
  OFFICIAL: 'official',
  COMMUNITY: 'community',
} as const

export type RegistryCategory = (typeof RegistryCategory)[keyof typeof RegistryCategory]
