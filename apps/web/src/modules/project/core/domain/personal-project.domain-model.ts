import {
  checkWorkspace,
  Language,
  MANIFEST_FILE,
  parseManifest,
  RUNTIME_OF_LANGUAGE,
  TEST_RUNNER_OF_RUNTIME,
  type Manifest,
  type TourStep,
} from '@typika/manifest'
import { ProjectPathSchema } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'

import { ProjectManifestMissingError } from './errors/project-manifest-missing.error.ts'
import { ProjectTemplateInvalidError } from './errors/project-template-invalid.error.ts'
import type { ProjectFiles, ProjectOrigin } from './project.domain-model.ts'

export const PERSONAL_LANGUAGES: ReadonlyArray<Language> = Object.values(Language)

const DEFAULT_SLUG = 'my-project'
const MIN_SLUG = 3
const MAX_SLUG = 64
const MAX_TITLE = 80
const PLACEHOLDER_AUTHOR = 'github:your-login'

export const manifestNameOf = (name: string): string => {
  const slug = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, MAX_SLUG)
    .replace(/^-+|-+$/g, '')
  return slug.length < MIN_SLUG ? DEFAULT_SLUG : slug
}

const titleOf = (name: string) => name.trim().slice(0, MAX_TITLE) || DEFAULT_SLUG

const LICENSE = `MIT No Attribution

Copyright the authors of this project

Permission is hereby granted, free of charge, to any person obtaining a copy of this
software and associated documentation files (the "Software"), to deal in the Software
without restriction, including without limitation the rights to use, copy, modify,
merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
`

const LANGUAGE_TITLES: Readonly<Record<Language, string>> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  go: 'Go',
  kotlin: 'Kotlin',
}

type Skeleton = {
  readonly entry: string
  readonly tests: string
  readonly files: (slug: string) => Readonly<Record<string, string>>
}

const javascriptSkeleton = (extension: 'ts' | 'js'): Skeleton => ({
  entry: `src/main.${extension}`,
  tests: `tests/**/*.test.${extension}`,
  files: (slug) => ({
    'package.json': `${JSON.stringify(
      {
        name: slug,
        private: true,
        type: 'module',
        scripts: { start: `node src/main.${extension}`, test: 'vitest run --dir tests' },
        devDependencies: extension === 'ts' ? { typescript: '7.0.2', vitest: '5.0.3' } : { vitest: '5.0.3' },
      },
      null,
      2
    )}\n`,
    ...(extension === 'ts'
      ? {
          'tsconfig.json': `${JSON.stringify(
            {
              compilerOptions: {
                target: 'es2022',
                module: 'nodenext',
                strict: true,
                noEmit: true,
                allowImportingTsExtensions: true,
                erasableSyntaxOnly: true,
                verbatimModuleSyntax: true,
                skipLibCheck: true,
              },
              include: ['src', 'tests'],
            },
            null,
            2
          )}\n`,
        }
      : {}),
    [`src/main.${extension}`]: `import { greet } from './greeting.${extension}'\n\nconsole.log(greet('world'))\n`,
    [`src/greeting.${extension}`]:
      extension === 'ts'
        ? 'export const greet = (name: string): string => `Hello, ${name}!`\n'
        : 'export const greet = (name) => `Hello, ${name}!`\n',
    [`tests/greeting.test.${extension}`]: `import { describe, expect, it } from 'vitest'
import { greet } from '../src/greeting.${extension}'

describe('greet', () => {
  it('greets by name', () => {
    expect(greet('Ada')).toBe('Hello, Ada!')
  })
})
`,
  }),
})

const goSkeleton: Skeleton = {
  entry: 'cmd/app/main.go',
  tests: '**/*_test.go',
  files: (slug) => ({
    'go.mod': `module example.com/${slug}\n\ngo 1.24\n`,
    'cmd/app/main.go': `package main

import (
	"fmt"

	"example.com/${slug}/internal/greeting"
)

func main() {
	fmt.Println(greeting.Greet("world"))
}
`,
    'internal/greeting/greeting.go': `package greeting

func Greet(name string) string {
	return "Hello, " + name + "!"
}
`,
    'internal/greeting/greeting_test.go': `package greeting_test

import (
	"testing"

	"example.com/${slug}/internal/greeting"
)

func TestGreetByName(t *testing.T) {
	if got := greeting.Greet("Ada"); got != "Hello, Ada!" {
		t.Errorf("Greet(\\"Ada\\") = %q, want %q", got, "Hello, Ada!")
	}
}
`,
  }),
}

const kotlinSkeleton: Skeleton = {
  entry: 'src/main/kotlin/Main.kt',
  tests: 'src/test/kotlin/**/*.kt',
  files: (slug) => ({
    'settings.gradle.kts': `rootProject.name = "${slug}"\n`,
    'build.gradle.kts': `plugins {
    kotlin("jvm") version "2.4.21"
    application
}

repositories {
    mavenCentral()
}

dependencies {
    testImplementation(kotlin("test"))
}

application {
    mainClass = "MainKt"
}

tasks.test {
    useJUnitPlatform()
}
`,
    'src/main/kotlin/Main.kt': `fun main() {
    println(greet("world"))
}
`,
    'src/main/kotlin/Greeting.kt': `fun greet(name: String): String = "Hello, $name!"\n`,
    'src/test/kotlin/GreetingTest.kt': `import kotlin.test.Test
import kotlin.test.assertEquals

class GreetingTest {
    @Test
    fun greetsByName() {
        assertEquals("Hello, Ada!", greet("Ada"))
    }
}
`,
  }),
}

const SKELETONS: Readonly<Record<Language, Skeleton>> = {
  typescript: javascriptSkeleton('ts'),
  javascript: javascriptSkeleton('js'),
  go: goSkeleton,
  kotlin: kotlinSkeleton,
}

const manifestOf = ({
  slug,
  title,
  language,
  skeleton,
}: {
  readonly slug: string
  readonly title: string
  readonly language: Language
  readonly skeleton: Skeleton
}) => {
  const runtime = RUNTIME_OF_LANGUAGE[language]
  return `schema = 1
name = "${slug}"
title = ${JSON.stringify(title)}
summary = "A blank ${LANGUAGE_TITLES[language]} project."
license = "MIT-0"
authors = ["${PLACEHOLDER_AUTHOR}"]

[facets]
language = "${language}"
topic = ["fundamental/playground"]
level = "beginner"

[runtime]
kind = "${runtime}"
entry = "${skeleton.entry}"

[commands]
test = "${TEST_RUNNER_OF_RUNTIME[runtime]}"

[tests]
include = ["${skeleton.tests}"]
`
}

const toProjectPath = Schema.decodeUnknownSync(ProjectPathSchema)

export const blankProjectFiles = ({
  name,
  language,
}: {
  readonly name: string
  readonly language: Language
}): ProjectFiles => {
  const slug = manifestNameOf(name)
  const title = titleOf(name)
  const skeleton = SKELETONS[language]
  return new Map(
    Object.entries({
      [MANIFEST_FILE]: manifestOf({ slug, title, language, skeleton }),
      'README.md': `# ${title}\n\nA blank ${LANGUAGE_TITLES[language]} project: run \`${skeleton.entry}\`, or run its tests.\n`,
      LICENSE,
      ...skeleton.files(slug),
    }).map(([path, content]) => [toProjectPath(path), content])
  )
}

export type PersonalTemplate = { readonly manifest: Manifest; readonly tourSteps: ReadonlyArray<TourStep> }

export const personalTemplateOf = (
  files: ProjectFiles,
  name = ''
): Effect.Effect<PersonalTemplate, ProjectManifestMissingError | ProjectTemplateInvalidError> =>
  Effect.gen(function* () {
    const source = files.get(toProjectPath(MANIFEST_FILE))
    if (source === undefined) return yield* new ProjectManifestMissingError({ name })
    const parsed = yield* parseManifest(source).pipe(
      Effect.mapError((error) => new ProjectTemplateInvalidError({ name, issues: error.issues }))
    )
    const manifest = { ...parsed, exercises: [] }
    const { tourSteps } = yield* checkWorkspace(manifest, files).pipe(
      Effect.mapError((error) => new ProjectTemplateInvalidError({ name: manifest.name, issues: error.issues }))
    )
    return { manifest, tourSteps }
  })

export const personalOriginOf = (manifest: Manifest): ProjectOrigin => ({
  kind: 'personal',
  name: manifest.name,
  language: manifest.facets.language,
})
