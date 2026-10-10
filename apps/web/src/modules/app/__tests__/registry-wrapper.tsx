import { RegistryProvider } from '@effect/atom-react'
import type * as Layer from 'effect/Layer'
import * as Atom from 'effect/reactivity/Atom'
import type { ReactNode } from 'react'

import type { AppLayer } from '../core/app.layer.ts'
import { appRuntime } from '../core/app.runtime.ts'

export const makeRegistryWrapper =
  (layer: Layer.Layer<Layer.Success<typeof AppLayer>>) =>
  ({ children }: { readonly children: ReactNode }) => (
    <RegistryProvider initialValues={[Atom.initialValue(appRuntime.layer, layer)]}>{children}</RegistryProvider>
  )
