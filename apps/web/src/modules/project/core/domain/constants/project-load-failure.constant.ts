export const ProjectLoadFailure = {
  NETWORK: 'network',
  INVALID: 'invalid',
  UNSUPPORTED: 'unsupported',
} as const

export type ProjectLoadFailure = (typeof ProjectLoadFailure)[keyof typeof ProjectLoadFailure]
