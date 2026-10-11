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

export const percentOff = (amount: Money, percent: number): Money =>
  money(Math.round((amount.cents * (100 - percent)) / 100))

export const formatMoney = (amount: Money): string => `${(amount.cents / 100).toFixed(2)} ${amount.currency}`
