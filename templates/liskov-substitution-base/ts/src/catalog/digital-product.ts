import type { Money } from '../shop/money.ts'
import { PhysicalProduct, type Parcel, type Sku } from './physical-product.ts'

export class DigitalProduct extends PhysicalProduct {
  private readonly downloadUrl: string

  constructor(sku: Sku, name: string, price: Money, downloadUrl: string) {
    super(sku, name, price, 0)
    this.downloadUrl = downloadUrl
  }

  override ship(_address: string): Parcel {
    throw new Error(`${this.sku} is digital and cannot be shipped`)
  }

  downloadLink(): string {
    return this.downloadUrl
  }
}
