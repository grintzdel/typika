import { createFileRoute } from '@tanstack/react-router'

import { publicConfigResponse } from '../modules/shared/server/public-config-response.ts'

export const Route = createFileRoute('/config.json')({
  server: { handlers: { GET: () => publicConfigResponse(process.env) } },
})
