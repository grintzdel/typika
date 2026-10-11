import { percentOff, type Money } from '../shop/money.ts'
import { PerishableProduct } from './perishable-product.ts'
import type { Sku } from './product.ts'

export class DiscountedPerishableProduct extends PerishableProduct {
  private readonly discountPercent: number

  constructor(sku: Sku, name: string, basePrice: Money, discountPercent: number) {
    super(sku, name, basePrice)
    this.discountPercent = discountPercent
  }

  override price(): Money {
    return percentOff(super.price(), this.discountPercent)
  }
}
