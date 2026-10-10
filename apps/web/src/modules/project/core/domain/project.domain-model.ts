import type { ProjectSnapshot } from '@typika/runtime-core'

export type TemplateProject = ProjectSnapshot & {
  readonly templateName: string
}
