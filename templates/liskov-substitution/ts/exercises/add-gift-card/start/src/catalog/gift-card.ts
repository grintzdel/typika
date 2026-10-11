import type { Money } from '../shop/money.ts'
import { PhysicalProduct, type Sku } from './physical-product.ts'

export class GiftCard extends PhysicalProduct {
  constructor(sku: Sku, name: string, price: Money) {
    super(sku, name, price, 0)
  }
}
