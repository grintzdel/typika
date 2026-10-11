export const CARRIER_NAMES = ['standard', 'express', 'locker'] as const

export type CarrierName = (typeof CARRIER_NAMES)[number]
