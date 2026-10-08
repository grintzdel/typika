export const SHIPPING_OPTIONS = ['standard', 'express', 'pickup-point'] as const

export type ShippingOption = (typeof SHIPPING_OPTIONS)[number]
