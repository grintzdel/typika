import type { Money } from '../shop/money.ts'
import type { Downloadable, Product, Sku } from './product.ts'

export class DigitalProduct implements Product, Downloadable {
  readonly sku: Sku
  readonly name: string
  readonly price: Money
  private readonly downloadUrl: string

  constructor(sku: Sku, name: string, price: Money, downloadUrl: string) {
    this.sku = sku
    this.name = name
    this.price = price
    this.downloadUrl = downloadUrl
  }

  downloadLink(): string {
    return this.downloadUrl
  }
}
