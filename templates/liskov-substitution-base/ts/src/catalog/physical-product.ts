import type { Money } from '../shop/money.ts'

export type Sku = string

export type Parcel = {
  readonly sku: Sku
  readonly address: string
  readonly weightInGrams: number
}

export class PhysicalProduct {
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
