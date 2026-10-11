import { describe, expect, it } from 'vitest'
import { productBySku } from '../src/catalog/catalog.js'
import { money } from '../src/shop/money.js'

const sheetOf = (sku) => {
  const product = productBySku(sku)
  return { price: product.price(), shipping: product.shippingMethod(), packaging: product.packaging() }
}

describe('catalog', () => {
  it('sells e-books without shipping or packaging', () => {
    expect(sheetOf('EBOOK-TEA')).toEqual({ price: money(990), shipping: 'none', packaging: [] })
  })

  it('ships physical products as parcels, in a cardboard box', () => {
    expect(sheetOf('MUG-01')).toEqual({ price: money(1200), shipping: 'parcel', packaging: ['cardboard box'] })
  })

  it('ships perishable products refrigerated, in an insulated box', () => {
    expect(sheetOf('CHEESE-01')).toEqual({
      price: money(890),
      shipping: 'refrigerated',
      packaging: ['insulated box'],
    })
  })

  it('takes the discount off the price of a discounted product', () => {
    expect(sheetOf('YOGURT-01')).toEqual({
      price: money(315),
      shipping: 'refrigerated',
      packaging: ['insulated box'],
    })
  })

  it('refuses an unknown product', () => {
    expect(() => productBySku('NOPE-01')).toThrow('Unknown product NOPE-01')
  })
})
