import { GoRelease } from '../domain/constants/go-release.constant.ts'

const KNOWN_OS = new Set([
  'aix',
  'android',
  'darwin',
  'dragonfly',
  'freebsd',
  'hurd',
  'illumos',
  'ios',
  'js',
  'linux',
  'nacl',
  'netbsd',
  'openbsd',
  'plan9',
  'solaris',
  'wasip1',
  'windows',
  'zos',
])

const KNOWN_ARCH = new Set([
  '386',
  'amd64',
  'arm',
  'arm64',
  'loong64',
  'mips',
  'mips64',
  'mips64le',
  'mipsle',
  'ppc64',
  'ppc64le',
  'riscv64',
  's390x',
  'wasm',
])

const minorOf = (version: string) => Number(version.replace(/^go1\./, '').split('.')[0])

const tagHolds = (tag: string): boolean => {
  if (tag === GoRelease.GOOS || tag === GoRelease.GOARCH || tag === 'gc') return true
  const release = /^go1\.(\d+)$/.exec(tag)
  return release !== null && Number(release[1]) <= minorOf(GoRelease.VERSION)
}

const evaluate = (expression: string): boolean => {
  const tokens = expression.match(/\|\||&&|!|\(|\)|[\w.]+/g) ?? []
  let index = 0
  const or = (): boolean => {
    let value = and()
    while (tokens[index] === '||') {
      index += 1
      value = and() || value
    }
    return value
  }
  const and = (): boolean => {
    let value = not()
    while (tokens[index] === '&&') {
      index += 1
      value = not() && value
    }
    return value
  }
  const not = (): boolean => {
    const token = tokens[index]
    index += 1
    if (token === '!') return !not()
    if (token === '(') {
      const value = or()
      index += 1
      return value
    }
    return token !== undefined && tagHolds(token)
  }
  return or()
}

const fileNameHolds = (fileName: string) => {
  const parts = fileName
    .replace(/\.go$/, '')
    .replace(/_test$/, '')
    .split('_')
    .slice(1)
  const last = parts.at(-1)
  const beforeLast = parts.at(-2)
  if (last !== undefined && KNOWN_ARCH.has(last)) {
    if (last !== GoRelease.GOARCH) return false
    return beforeLast === undefined || !KNOWN_OS.has(beforeLast) || beforeLast === GoRelease.GOOS
  }
  return last === undefined || !KNOWN_OS.has(last) || last === GoRelease.GOOS
}

export const matchesBuildContext = (fileName: string, buildConstraint: string | undefined): boolean =>
  fileNameHolds(fileName) && (buildConstraint === undefined || evaluate(buildConstraint))
