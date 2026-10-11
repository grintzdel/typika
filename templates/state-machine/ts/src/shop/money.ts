export type Money = {
  readonly cents: number
  readonly currency: 'EUR'
}

export const money = (cents: number): Money => {
  if (!Number.isInteger(cents)) throw new Error(`Money must be a whole number of cents, got ${cents}`)
  return { cents, currency: 'EUR' }
}

export const ZERO = money(0)

export const addMoney = (a: Money, b: Money): Money => money(a.cents + b.cents)

export const multiplyMoney = (amount: Money, factor: number): Money => money(amount.cents * factor)

export const formatMoney = (amount: Money): string => `${(amount.cents / 100).toFixed(2)} ${amount.currency}`
