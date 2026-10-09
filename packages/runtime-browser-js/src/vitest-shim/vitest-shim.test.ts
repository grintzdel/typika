import * as runnerApi from '@typika/test-runner'
import { expect, it } from 'vitest'

import { VITEST_EXPORTS, vitestShimSource } from './vitest-shim.ts'

it('re-exports every value of the test runner API', () => {
  expect([...VITEST_EXPORTS].toSorted()).toEqual(Object.keys(runnerApi).toSorted())
})

it('reads the API from the global set by the execution worker', () => {
  expect(vitestShimSource).toContain('Symbol.for("typika.vitest")')
  expect(vitestShimSource).toContain('export const describe = api.describe')
})
