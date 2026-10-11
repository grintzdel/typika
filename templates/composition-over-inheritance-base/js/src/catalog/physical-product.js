import { Product } from './product.js'

export class PhysicalProduct extends Product {
  shippingMethod() {
    return 'parcel'
  }

  packaging() {
    return ['cardboard box']
  }
}
