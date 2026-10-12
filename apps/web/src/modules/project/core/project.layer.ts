import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import { SharedLayer } from '../../shared/core/shared.layer.ts'
import { ProjectStorageIndexedDbLayer } from './adapters/project-storage.indexeddb.adapter.ts'
import { TemplateFilesFetchLayer } from './adapters/template-files.fetch.adapter.ts'
import { TemplateIndexFetchLayer } from './adapters/template-index.fetch.adapter.ts'

// A static import would put every template of the monorepo in the production bundle.
const TemplateSourceLayer = import.meta.env.DEV
  ? Layer.unwrap(
      Effect.promise(
        async () => (await import('./adapters/template-source.bundled.adapter.ts')).TemplateSourceBundledLayer
      )
    )
  : Layer.mergeAll(TemplateIndexFetchLayer, TemplateFilesFetchLayer).pipe(Layer.provide(SharedLayer))

export const ProjectLayer = Layer.mergeAll(TemplateSourceLayer, ProjectStorageIndexedDbLayer)
