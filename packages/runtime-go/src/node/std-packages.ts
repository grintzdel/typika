import { execFileSync } from 'node:child_process'
import { relative } from 'node:path'

import { GO_LIST_FIELDS } from '../domain/constants/go-list-field.constant.ts'
import { GoRelease } from '../domain/constants/go-release.constant.ts'
import { STD_ROOTS } from '../domain/constants/std-roots.constant.ts'
import { parseGoListJson, type StdPackages } from '../domain/go-list.domain-model.ts'

const STD_FIELDS = GO_LIST_FIELDS.filter(
  (field) => !['ForTest', 'Module', 'DepOnly', 'Error', 'DepsErrors'].includes(field)
)

export const wasmGoEnv = {
  ...process.env,
  GOOS: GoRelease.GOOS,
  GOARCH: GoRelease.GOARCH,
  CGO_ENABLED: '0',
  GOTOOLCHAIN: 'local',
  GOWORK: 'off',
  GOFLAGS: '',
}

export const listStdPackages = (roots: ReadonlyArray<string> = STD_ROOTS): StdPackages => {
  const goroot = execFileSync('go', ['env', 'GOROOT'], { env: wasmGoEnv, encoding: 'utf8' }).trim()
  const stdout = execFileSync(
    'go',
    ['list', '-e', `-json=${STD_FIELDS.join(',')}`, '-compiled=true', '-deps=true', '--', 'builtin', ...roots],
    { env: wasmGoEnv, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  )
  return new Map(
    parseGoListJson(stdout).map((pkg) => [
      pkg.ImportPath,
      { ...pkg, ...(pkg.Dir === undefined ? {} : { Dir: relative(goroot, pkg.Dir) }) },
    ])
  )
}
