import * as Layer from 'effect/Layer'

import { ProjectStorageIndexedDbLayer } from './adapters/project-storage.indexeddb.adapter.ts'
import { TemplateSourceBundledLayer } from './adapters/template-source.bundled.adapter.ts'

export const ProjectLayer = Layer.mergeAll(TemplateSourceBundledLayer, ProjectStorageIndexedDbLayer)
