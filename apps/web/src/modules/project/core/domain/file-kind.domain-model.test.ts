import { describe, expect, it } from 'vitest'

import { FileKind, fileKindOf } from './file-kind.domain-model.ts'

describe('fileKindOf', () => {
  it('names the language of a source file from its extension', () => {
    expect(fileKindOf('src/main.ts')).toBe(FileKind.TYPESCRIPT)
    expect(fileKindOf('src/view.tsx')).toBe(FileKind.TYPESCRIPT)
    expect(fileKindOf('scripts/build.mjs')).toBe(FileKind.JAVASCRIPT)
    expect(fileKindOf('cmd/main.go')).toBe(FileKind.GO)
    expect(fileKindOf('src/main/kotlin/Order.kt')).toBe(FileKind.KOTLIN)
    expect(fileKindOf('build.gradle.kts')).toBe(FileKind.KOTLIN)
  })

  it('recognises the data, documentation and configuration files', () => {
    expect(fileKindOf('package.json')).toBe(FileKind.JSON)
    expect(fileKindOf('README.md')).toBe(FileKind.MARKDOWN)
    expect(fileKindOf('typika.toml')).toBe(FileKind.CONFIG)
    expect(fileKindOf('gradle/wrapper/gradle-wrapper.properties')).toBe(FileKind.CONFIG)
    expect(fileKindOf('go.mod')).toBe(FileKind.GO)
    expect(fileKindOf('go.sum')).toBe(FileKind.GO)
  })

  it('recognises the scripts and the archives', () => {
    expect(fileKindOf('gradlew')).toBe(FileKind.SHELL)
    expect(fileKindOf('gradlew.bat')).toBe(FileKind.SHELL)
    expect(fileKindOf('gradle/wrapper/gradle-wrapper.jar')).toBe(FileKind.ARCHIVE)
  })

  it('falls back to plain text, whatever the case of the extension', () => {
    expect(fileKindOf('LICENSE')).toBe(FileKind.TEXT)
    expect(fileKindOf('.gitignore')).toBe(FileKind.TEXT)
    expect(fileKindOf('notes.txt')).toBe(FileKind.TEXT)
    expect(fileKindOf('NOTES.MD')).toBe(FileKind.MARKDOWN)
  })
})
