import { Product, type ShippingMethod } from './product.ts'

export class PhysicalProduct extends Product {
  override shippingMethod(): ShippingMethod {
    return 'parcel'
  }

  override packaging(): readonly string[] {
    return ['cardboard box']
  }
}
