import { useRouter } from '@tanstack/react-router'

import { RegistryIndexFailure } from '../../../shared/core/domain/constants/registry-index-failure.constant.ts'
import { RegistryIndexUnavailableError } from '../../../shared/core/domain/errors/registry-index-unavailable.error.ts'

export const useHubIndexFailure = (error: unknown) => {
  const router = useRouter()
  return {
    failure: error instanceof RegistryIndexUnavailableError ? error.failure : RegistryIndexFailure.NETWORK,
    handleRetry: () => void router.invalidate(),
  }
}
