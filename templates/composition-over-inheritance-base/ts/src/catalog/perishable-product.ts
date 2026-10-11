import { PhysicalProduct } from './physical-product.ts'
import type { ShippingMethod } from './product.ts'

export class PerishableProduct extends PhysicalProduct {
  override shippingMethod(): ShippingMethod {
    return 'refrigerated'
  }

  override packaging(): readonly string[] {
    return ['insulated box']
  }
}
