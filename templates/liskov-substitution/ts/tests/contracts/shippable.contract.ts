import { expect, it } from 'vitest'
import type { Shippable } from '../../src/catalog/product.ts'

// #region tour:contract-tests
export const behavesLikeShippable = (make: () => Shippable) => {
  it('weighs something', () => {
    expect(make().weightInGrams()).toBeGreaterThan(0)
  })

  it('ships a parcel that weighs what it announced', () => {
    const product = make()

    expect(product.ship('12 rue des Lilas, Lyon').weightInGrams).toBe(product.weightInGrams())
  })

  it('ships to the address it is given', () => {
    expect(make().ship('3 Rosenweg, Berlin').address).toBe('3 Rosenweg, Berlin')
  })
}
// #endregion
