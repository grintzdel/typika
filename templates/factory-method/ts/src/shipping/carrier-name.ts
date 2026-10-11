export const CARRIER_NAMES = ['standard', 'express'] as const

export type CarrierName = (typeof CARRIER_NAMES)[number]
