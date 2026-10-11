import { percentOff } from '../shop/money.js'
import { PerishableProduct } from './perishable-product.js'

export class DiscountedPerishableProduct extends PerishableProduct {
  #discountPercent

  constructor(sku, name, basePrice, discountPercent) {
    super(sku, name, basePrice)
    this.#discountPercent = discountPercent
  }

  price() {
    return percentOff(super.price(), this.#discountPercent)
  }
}
