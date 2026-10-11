export class Product {
  #basePrice

  constructor(sku, name, basePrice) {
    this.sku = sku
    this.name = name
    this.#basePrice = basePrice
  }

  price() {
    return this.#basePrice
  }

  shippingMethod() {
    return 'none'
  }

  packaging() {
    return []
  }
}
