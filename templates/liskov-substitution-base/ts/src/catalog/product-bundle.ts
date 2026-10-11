import type { Money } from '../shop/money.ts'
import { PhysicalProduct, type Sku } from './physical-product.ts'

const BOX_WEIGHT_IN_GRAMS = 300

export class ProductBundle extends PhysicalProduct {
  readonly items: readonly PhysicalProduct[]

  constructor(sku: Sku, name: string, price: Money, items: readonly PhysicalProduct[]) {
    super(sku, name, price, items.reduce((sum, item) => sum + item.weightInGrams(), BOX_WEIGHT_IN_GRAMS))
    this.items = items
  }
}
