export const SHIPPING_OPTIONS = ['standard', 'express'] as const

export type ShippingOption = (typeof SHIPPING_OPTIONS)[number]
