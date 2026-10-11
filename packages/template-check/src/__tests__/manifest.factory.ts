import { parseManifest, type Manifest } from '@typika/manifest'
import * as Effect from 'effect/Effect'

export type ManifestFixture = {
  readonly name?: string
  readonly language?: string
  readonly kind?: string
  readonly role?: 'template' | 'base'
  readonly topic?: string
  readonly extra?: string
}

const ENTRY: Readonly<Record<string, string>> = { 'browser-js': 'src/main.ts', go: 'main.go', kotlin: 'src/Main.kt' }

export const manifestToml = ({
  name = 'strategy-ts',
  language = 'typescript',
  kind = 'browser-js',
  role = 'template',
  topic = 'design-pattern/behavioral/strategy',
  extra = '',
}: ManifestFixture = {}) => `schema = 1
name = "${name}"
title = "Strategy"
summary = "A strategy."
license = "MIT-0"
authors = ["github:maoudin"]
role = "${role}"

[facets]
language = "${language}"
paradigm = ["oop"]
topic = ["${topic}"]
level = "intermediate"
useCase = ["backend"]

[runtime]
kind = "${kind}"
entry = "${ENTRY[kind] ?? 'src/main.ts'}"
${extra}`

export const manifestOf = (fixture: ManifestFixture = {}): Manifest =>
  Effect.runSync(parseManifest(manifestToml(fixture)))
