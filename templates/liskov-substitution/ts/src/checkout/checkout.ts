import { isDownloadable, isShippable, type Parcel, type Product } from '../catalog/product.ts'
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

export const checkout = (products: readonly Product[], address: string): CheckoutResult => {
  const shippables = products.filter(isShippable)
  const weight = shippables.reduce((sum, product) => sum + product.weightInGrams(), 0)

  const shipping =
    shippables.length === 0 ? ZERO : weight <= LIGHT_PARCEL_MAX_GRAMS ? LIGHT_PARCEL_FEE : HEAVY_PARCEL_FEE
  const total = addMoney(
    products.reduce((sum, product) => addMoney(sum, product.price), ZERO),
    shipping
  )

  return {
    total,
    shipping,
    parcels: shippables.map((product) => product.ship(address)),
    downloads: products.filter(isDownloadable).map((product) => product.downloadLink()),
  }
}
