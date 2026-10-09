export const VITEST_GLOBAL = 'typika.vitest'

export const VITEST_EXPORTS = [
  'afterAll',
  'afterEach',
  'beforeAll',
  'beforeEach',
  'describe',
  'expect',
  'it',
  'suite',
  'test',
  'vi',
] as const

export const vitestShimSource = [
  `const api = globalThis[Symbol.for(${JSON.stringify(VITEST_GLOBAL)})]`,
  ...VITEST_EXPORTS.map((name) => `export const ${name} = api.${name}`),
].join('\n')
