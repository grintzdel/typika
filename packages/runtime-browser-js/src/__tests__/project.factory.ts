import { parseManifest } from '@typika/manifest'
import { ProjectPathSchema, type FileContent, type ProjectPath, type ProjectSnapshot } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'

export const projectPath = Schema.decodeUnknownSync(ProjectPathSchema)

export const MANIFEST_TOML = `schema = 1
name = "sample-ts"
title = "Sample"
summary = "A sample project."
license = "MIT-0"
authors = ["github:maoudin"]
role = "base"

[facets]
language = "typescript"
paradigm = ["oop"]
topic = ["design-pattern/behavioral/strategy"]
level = "intermediate"
useCase = ["backend"]

[runtime]
kind = "browser-js"
entry = "src/main.ts"
`

export const filesOf = (files: Readonly<Record<string, FileContent>>): ReadonlyMap<ProjectPath, FileContent> =>
  new Map(Object.entries(files).map(([path, content]) => [projectPath(path), content]))

export const projectFixture = (
  files: Readonly<Record<string, FileContent>>,
  manifestToml: string = MANIFEST_TOML
): ProjectSnapshot => ({
  files: filesOf({ 'typika.toml': manifestToml, ...files }),
  manifest: Effect.runSync(parseManifest(manifestToml)),
})
