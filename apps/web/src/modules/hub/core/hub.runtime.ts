import type * as Effect from 'effect/Effect'
import * as ManagedRuntime from 'effect/ManagedRuntime'

import { HubLayer } from './hub.layer.ts'
import type { RegistryIndexPort } from './ports/registry-index.port.ts'

const hubRuntime = ManagedRuntime.make(HubLayer)

export const runHubProgram = <A, E>(program: Effect.Effect<A, E, RegistryIndexPort>): Promise<A> =>
  hubRuntime.runPromise(program)
