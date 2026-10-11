import type { Money } from '../shop/money.ts'
import type { Parcel, Product, Shippable, Sku } from './product.ts'

const BOX_WEIGHT_IN_GRAMS = 300

export class ProductBundle implements Product, Shippable {
  readonly sku: Sku
  readonly name: string
  readonly price: Money
  readonly items: readonly Shippable[]

  constructor(sku: Sku, name: string, price: Money, items: readonly Shippable[]) {
    this.sku = sku
    this.name = name
    this.price = price
    this.items = items
  }

  weightInGrams(): number {
    return this.items.reduce((sum, item) => sum + item.weightInGrams(), 0)
  }

  ship(address: string): Parcel {
    return { sku: this.sku, address, weightInGrams: this.weightInGrams() + BOX_WEIGHT_IN_GRAMS }
  }
}
