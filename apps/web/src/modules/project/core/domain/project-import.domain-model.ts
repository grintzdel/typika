import {
  MANIFEST_FILE,
  parseManifest,
  parseTemplateRef,
  withoutExercises,
  type Language,
  type TemplateFiles,
  type TemplateRef,
} from '@typika/manifest'
import { ProjectPathSchema } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'
import { unzipSync } from 'fflate'

import { ProjectSourceInvalidError } from './errors/project-source-invalid.error.ts'
import { ProjectTemplateInvalidError } from './errors/project-template-invalid.error.ts'
import { blankProjectFiles } from './personal-project.domain-model.ts'
import type { ProjectFiles } from './project.domain-model.ts'

const GITHUB_HOSTS: ReadonlySet<string> = new Set(['github.com', 'www.github.com'])
const RAW_HOST = 'raw.githubusercontent.com'
const MANIFEST_SUFFIX = `/${MANIFEST_FILE}`
const MAX_ARCHIVE_BYTES = 5_000_000
const MAX_ARCHIVE_FILE_BYTES = 1_000_000
const ARCHIVER_FILES = /(^|\/)(__MACOSX\/|\.DS_Store$)/

const folderOf = (path: string) => {
  const trimmed = path.replace(/\/+$/, '')
  const folder =
    trimmed === MANIFEST_FILE
      ? ''
      : trimmed.endsWith(MANIFEST_SUFFIX)
        ? trimmed.slice(0, -MANIFEST_SUFFIX.length)
        : trimmed
  return folder === '' ? undefined : folder
}

const refOfParts = (owner: string, repo: string, ref: string | undefined, path: string | undefined) =>
  parseTemplateRef(
    `github:${owner}/${repo.replace(/\.git$/, '')}${path === undefined ? '' : `/${path}`}${ref === undefined ? '' : `@${ref}`}`
  )

const refOfUrl = (url: URL): Option.Option<TemplateRef> => {
  const [owner, repo, kind, ref, ...rest] = url.pathname.split('/').filter((segment) => segment !== '')
  if (owner === undefined || repo === undefined) return Option.none()
  if (url.hostname === RAW_HOST)
    return kind === undefined ? Option.none() : refOfParts(owner, repo, kind, folderOf([ref, ...rest].join('/')))
  if (!GITHUB_HOSTS.has(url.hostname)) return Option.none()
  if (kind === undefined) return refOfParts(owner, repo, undefined, undefined)
  if ((kind !== 'tree' && kind !== 'blob') || ref === undefined) return Option.none()
  return refOfParts(owner, repo, ref, folderOf(rest.join('/')))
}

export const templateRefOfInput = (input: string): Option.Option<TemplateRef> => {
  const trimmed = input.trim()
  if (trimmed.startsWith('github:')) return parseTemplateRef(trimmed)
  return URL.canParse(trimmed) ? refOfUrl(new URL(trimmed)) : Option.none()
}

const decodePath = Schema.decodeUnknownOption(ProjectPathSchema)

export const projectFilesOfImport = (files: TemplateFiles): ProjectFiles =>
  new Map(
    [...withoutExercises(files)].flatMap(([path, content]) =>
      typeof content === 'string'
        ? Option.match(decodePath(path), { onNone: () => [], onSome: (valid) => [[valid, content] as const] })
        : []
    )
  )

const textOf = (bytes: Uint8Array): string | Uint8Array => {
  try {
    return bytes.includes(0) ? bytes : new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return bytes
  }
}

const withoutWrapper = (files: TemplateFiles): TemplateFiles => {
  const roots = new Set([...files.keys()].map((path) => (path.includes('/') ? path.split('/')[0] : '')))
  const [root] = roots
  if (roots.size !== 1 || root === undefined || root === '' || files.has(MANIFEST_FILE)) return files
  return new Map([...files].map(([path, content]) => [path.slice(root.length + 1), content]))
}

export const filesOfArchive = (bytes: Uint8Array): Effect.Effect<TemplateFiles, ProjectSourceInvalidError> =>
  Effect.gen(function* () {
    if (bytes.byteLength > MAX_ARCHIVE_BYTES) return yield* new ProjectSourceInvalidError({ reason: 'too-large' })
    const entries = yield* Effect.try({
      try: () =>
        unzipSync(bytes, {
          filter: (file) =>
            !file.name.endsWith('/') && !ARCHIVER_FILES.test(file.name) && file.originalSize <= MAX_ARCHIVE_FILE_BYTES,
        }),
      catch: () => new ProjectSourceInvalidError({ reason: 'archive' }),
    })
    return withoutWrapper(new Map(Object.entries(entries).map(([path, content]) => [path, textOf(content)])))
  })

const STANDALONE_ENTRY: Readonly<Record<Language, string>> = {
  typescript: "console.log('Hello, world!')\n",
  javascript: "console.log('Hello, world!')\n",
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, world!")\n}\n',
  kotlin: 'fun main() {\n    println("Hello, world!")\n}\n',
}

const toProjectPath = Schema.decodeUnknownSync(ProjectPathSchema)

export const filesOfManifest = (source: string): Effect.Effect<ProjectFiles, ProjectTemplateInvalidError> =>
  Effect.gen(function* () {
    const manifest = yield* parseManifest(source).pipe(
      Effect.mapError((error) => new ProjectTemplateInvalidError({ name: MANIFEST_FILE, issues: error.issues }))
    )
    const language = manifest.facets.language
    const files = new Map(blankProjectFiles({ name: manifest.name, language }))
    files.set(toProjectPath(MANIFEST_FILE), source)
    const entry = Option.getOrUndefined(decodePath(manifest.runtime.entry))
    if (entry !== undefined && !files.has(entry)) files.set(entry, STANDALONE_ENTRY[language])
    return files
  })
