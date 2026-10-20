import { parseManifest, type Exercise, type Manifest } from '@typika/manifest'
import * as Effect from 'effect/Effect'

export const manifestToml = ({
  name = 'strategy-ts',
  language = 'typescript',
  kind = 'browser-js',
  entry = 'src/main.ts',
  extra = '',
}: {
  readonly name?: string
  readonly language?: string
  readonly kind?: string
  readonly entry?: string
  readonly extra?: string
} = {}) => `schema = 1
name = "${name}"
title = "Strategy"
summary = "A strategy."
license = "MIT-0"
authors = ["github:maoudin"]

[facets]
language = "${language}"
paradigm = ["oop"]
topic = ["design-pattern/behavioral/strategy"]
level = "intermediate"
useCase = ["backend"]

[runtime]
kind = "${kind}"
entry = "${entry}"
${extra}`

export const manifestFixture = (overrides: Partial<Manifest> = {}): Manifest => ({
  ...Effect.runSync(parseManifest(manifestToml())),
  ...overrides,
})

export const exerciseFixture = (overrides: Partial<Exercise> = {}): Exercise => ({
  name: 'implement-express',
  kind: 'fix',
  title: 'Implement express',
  from: 'self',
  failing: ['tests/express.test.ts'],
  solutionFrom: 'start',
  hints: [],
  ...overrides,
})
