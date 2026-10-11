import { describe, expect, it } from 'vitest'
import { noPackaging } from '../src/catalog/packaging.js'
import { discounted } from '../src/catalog/pricing.js'
import { createProduct } from '../src/catalog/product.js'
import { noShipping } from '../src/catalog/shipping.js'
import { money } from '../src/shop/money.js'

describe('createProduct', () => {
  it('combines any pricing with any shipping and packaging', () => {
    const discountedEbook = createProduct({
      sku: 'EBOOK-SALE',
      name: 'A discounted e-book',
      basePrice: money(1000),
      pricing: discounted(50),
      shipping: noShipping,
      packaging: noPackaging,
    })

    expect(discountedEbook.price()).toEqual(money(500))
    expect(discountedEbook.shippingMethod()).toBe('none')
  })
})
