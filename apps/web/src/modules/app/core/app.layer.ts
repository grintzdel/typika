import * as Layer from 'effect/Layer'

import { EditorLayer } from '../../editor/core/editor.layer.ts'
import { ExerciseLayer } from '../../exercise/core/exercise.layer.ts'
import { ProjectLayer } from '../../project/core/project.layer.ts'
import { RuntimeLayer } from '../../runtime/core/runtime.layer.ts'

export const AppLayer = Layer.mergeAll(ProjectLayer, RuntimeLayer, EditorLayer, ExerciseLayer)
