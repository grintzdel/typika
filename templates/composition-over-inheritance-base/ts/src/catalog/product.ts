import type { Money } from '../shop/money.ts'

export type Sku = string

export type ShippingMethod = 'none' | 'parcel' | 'refrigerated'

export class Product {
  readonly sku: Sku
  readonly name: string
  protected readonly basePrice: Money

  constructor(sku: Sku, name: string, basePrice: Money) {
    this.sku = sku
    this.name = name
    this.basePrice = basePrice
  }

  price(): Money {
    return this.basePrice
  }

  shippingMethod(): ShippingMethod {
    return 'none'
  }

  packaging(): readonly string[] {
    return []
  }
}
