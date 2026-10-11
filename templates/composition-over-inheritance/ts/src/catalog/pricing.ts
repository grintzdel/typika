import { percentOff, type Money } from '../shop/money.ts'

export type PricingPolicy = {
  readonly priceOf: (basePrice: Money) => Money
}

export const fullPrice: PricingPolicy = { priceOf: (basePrice) => basePrice }

export const discounted = (percent: number): PricingPolicy => ({
  priceOf: (basePrice) => percentOff(basePrice, percent),
})
