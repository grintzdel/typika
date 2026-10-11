export type ShippingMethod = 'none' | 'parcel' | 'refrigerated'

export type ShippingPolicy = {
  readonly method: ShippingMethod
}

export const noShipping: ShippingPolicy = { method: 'none' }

export const parcel: ShippingPolicy = { method: 'parcel' }

export const refrigerated: ShippingPolicy = { method: 'refrigerated' }
