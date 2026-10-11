import { DigitalProduct } from '../catalog/digital-product.ts'
import type { Parcel, PhysicalProduct } from '../catalog/physical-product.ts'
import { addMoney, money, ZERO, type Money } from '../shop/money.ts'

export type CheckoutResult = {
  readonly total: Money
  readonly shipping: Money
  readonly parcels: readonly Parcel[]
  readonly downloads: readonly string[]
}

const LIGHT_PARCEL_MAX_GRAMS = 2000
const LIGHT_PARCEL_FEE = money(490)
const HEAVY_PARCEL_FEE = money(990)

export const checkout = (products: readonly PhysicalProduct[], address: string): CheckoutResult => {
  const parcels: Parcel[] = []
  const downloads: string[] = []
  let weight = 0

  for (const product of products) {
    if (product instanceof DigitalProduct) {
      downloads.push(product.downloadLink())
      continue
    }
    weight += product.weightInGrams()
    parcels.push(product.ship(address))
  }

  const shipping = parcels.length === 0 ? ZERO : weight <= LIGHT_PARCEL_MAX_GRAMS ? LIGHT_PARCEL_FEE : HEAVY_PARCEL_FEE
  const total = addMoney(
    products.reduce((sum, product) => addMoney(sum, product.price), ZERO),
    shipping
  )

  return { total, shipping, parcels, downloads }
}
