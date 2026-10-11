import { describe } from 'vitest'
import { mug } from './catalog-fixture.ts'
import { behavesLikeShippable } from './contracts/shippable.contract.ts'

describe('PhysicalProduct', () => {
  behavesLikeShippable(mug)
})
