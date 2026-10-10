export const templateToml = (name = 'sample-ts') => `schema = 1
name = "${name}"
title = "Sample"
summary = "A sample template."
license = "MIT-0"
authors = ["github:maoudin"]

[facets]
language = "typescript"
paradigm = ["oop"]
topic = ["design-pattern/behavioral/strategy"]
level = "intermediate"
useCase = ["backend"]

[runtime]
kind = "browser-js"
entry = "src/main.ts"

[[exercises]]
name = "fix-it"
kind = "fix"
title = "Fix it"
failing = ["tests/a.test.ts"]
`

export const templateFiles = (name = 'sample-ts', overrides: Readonly<Record<string, string>> = {}) =>
  new Map(
    Object.entries({
      'typika.toml': templateToml(name),
      'README.md': '# Sample\n',
      LICENSE: 'MIT No Attribution\n',
      'src/main.ts': "console.log('hello')\n",
      'tests/a.test.ts': "import { it } from 'vitest'\nit('works', () => {})\n",
      'exercises/fix-it/README.md': '# Fix it\n',
      'exercises/fix-it/start/src/main.ts': "console.log('start')\n",
      'exercises/fix-it/solution/src/main.ts': "console.log('solution')\n",
      ...overrides,
    })
  )
