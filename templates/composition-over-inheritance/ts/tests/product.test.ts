import { describe, expect, it } from 'vitest'
import { noPackaging } from '../src/catalog/packaging.ts'
import { discounted } from '../src/catalog/pricing.ts'
import { Product } from '../src/catalog/product.ts'
import { noShipping } from '../src/catalog/shipping.ts'
import { money } from '../src/shop/money.ts'

describe('Product', () => {
  it('combines any pricing with any shipping and packaging', () => {
    const discountedEbook = new Product('EBOOK-SALE', 'A discounted e-book', money(1000), {
      pricing: discounted(50),
      shipping: noShipping,
      packaging: noPackaging,
    })

    expect(discountedEbook.price()).toEqual(money(500))
    expect(discountedEbook.shippingMethod()).toBe('none')
  })
})
