import type { Money } from '../shop/money.ts'

export type Sku = string

export type Parcel = {
  readonly sku: Sku
  readonly address: string
  readonly weightInGrams: number
}

// #region tour:contract
export interface Product {
  readonly sku: Sku
  readonly name: string
  readonly price: Money
}

export interface Shippable {
  weightInGrams(): number
  ship(address: string): Parcel
}

export interface Downloadable {
  downloadLink(): string
}
// #endregion

export const isShippable = (product: Product): product is Product & Shippable => 'ship' in product

export const isDownloadable = (product: Product): product is Product & Downloadable => 'downloadLink' in product
