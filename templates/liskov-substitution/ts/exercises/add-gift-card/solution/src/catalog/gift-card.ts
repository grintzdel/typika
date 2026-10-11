import type { Money } from '../shop/money.ts'
import type { Product, Sku } from './product.ts'

export class GiftCard implements Product {
  readonly sku: Sku
  readonly name: string
  readonly price: Money

  constructor(sku: Sku, name: string, price: Money) {
    this.sku = sku
    this.name = name
    this.price = price
  }
}
