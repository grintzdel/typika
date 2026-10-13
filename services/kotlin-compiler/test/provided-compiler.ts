import { inject } from 'vitest'

declare module 'vitest' {
  export interface ProvidedContext {
    kotlinCompilerUrl: string
  }
}

export const providedKotlinCompilerUrl = () => inject('kotlinCompilerUrl')
