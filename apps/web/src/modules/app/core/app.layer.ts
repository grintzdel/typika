import * as Layer from 'effect/Layer'

import { ProjectLayer } from '../../project/core/project.layer.ts'
import { RuntimeLayer } from '../../runtime/core/runtime.layer.ts'

export const AppLayer = Layer.mergeAll(ProjectLayer, RuntimeLayer)
