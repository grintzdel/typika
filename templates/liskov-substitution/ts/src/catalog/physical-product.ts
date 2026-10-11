import type { Money } from '../shop/money.ts'
import type { Parcel, Product, Shippable, Sku } from './product.ts'

export class PhysicalProduct implements Product, Shippable {
  readonly sku: Sku
  readonly name: string
  readonly price: Money
  private readonly weight: number

  constructor(sku: Sku, name: string, price: Money, weightInGrams: number) {
    this.sku = sku
    this.name = name
    this.price = price
    this.weight = weightInGrams
  }

  weightInGrams(): number {
    return this.weight
  }

  ship(address: string): Parcel {
    return { sku: this.sku, address, weightInGrams: this.weightInGrams() }
  }
}
