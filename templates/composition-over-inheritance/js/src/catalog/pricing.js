import { percentOff } from '../shop/money.js'

export const fullPrice = { priceOf: (basePrice) => basePrice }

export const discounted = (percent) => ({ priceOf: (basePrice) => percentOff(basePrice, percent) })
