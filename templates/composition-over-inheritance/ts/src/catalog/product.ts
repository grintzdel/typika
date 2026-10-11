import type { Money } from '../shop/money.ts'
import type { PackagingPolicy } from './packaging.ts'
import type { PricingPolicy } from './pricing.ts'
import type { ShippingMethod, ShippingPolicy } from './shipping.ts'

export type Sku = string

// #region tour:compose
export type ProductPolicies = {
  readonly pricing: PricingPolicy
  readonly shipping: ShippingPolicy
  readonly packaging: PackagingPolicy
}

export class Product {
  readonly sku: Sku
  readonly name: string
  private readonly basePrice: Money
  private readonly policies: ProductPolicies

  constructor(sku: Sku, name: string, basePrice: Money, policies: ProductPolicies) {
    this.sku = sku
    this.name = name
    this.basePrice = basePrice
    this.policies = policies
  }
  // #endregion

  // #region tour:delegate
  price(): Money {
    return this.policies.pricing.priceOf(this.basePrice)
  }

  shippingMethod(): ShippingMethod {
    return this.policies.shipping.method
  }

  packaging(): readonly string[] {
    return this.policies.packaging.materials
  }
  // #endregion
}
