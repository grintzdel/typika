import { PhysicalProduct } from './physical-product.js'

export class PerishableProduct extends PhysicalProduct {
  shippingMethod() {
    return 'refrigerated'
  }

  packaging() {
    return ['insulated box']
  }
}
