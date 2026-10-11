import { describe, expect, it } from 'vitest'
import { productBySku } from '../src/catalog/catalog.js'
import { money } from '../src/shop/money.js'

const sheetOf = (sku) => {
  const product = productBySku(sku)
  return { price: product.price(), shipping: product.shippingMethod(), packaging: product.packaging() }
}

describe('gift wrap', () => {
  it('wraps a physical product for 3.50 more', () => {
    expect(sheetOf('MUG-01-GIFT')).toEqual({
      price: money(1550),
      shipping: 'parcel',
      packaging: ['cardboard box', 'gift wrap'],
    })
  })

  it('wraps a perishable product, still shipped refrigerated', () => {
    expect(sheetOf('CHEESE-01-GIFT')).toEqual({
      price: money(1240),
      shipping: 'refrigerated',
      packaging: ['insulated box', 'gift wrap'],
    })
  })

  it('adds the fee after the discount of a discounted product', () => {
    expect(sheetOf('MUG-02-GIFT')).toEqual({
      price: money(1470),
      shipping: 'parcel',
      packaging: ['cardboard box', 'gift wrap'],
    })
  })

  it('leaves the products without gift wrap unchanged', () => {
    expect(sheetOf('MUG-01')).toEqual({ price: money(1200), shipping: 'parcel', packaging: ['cardboard box'] })
  })
})
