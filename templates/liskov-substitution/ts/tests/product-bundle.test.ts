import { describe } from 'vitest'
import { teaSet } from './catalog-fixture.ts'
import { behavesLikeShippable } from './contracts/shippable.contract.ts'

describe('ProductBundle', () => {
  behavesLikeShippable(teaSet)
})
