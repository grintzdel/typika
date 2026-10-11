export const money = (cents) => {
  if (!Number.isInteger(cents)) throw new Error(`Money must be a whole number of cents, got ${cents}`)
  return { cents, currency: 'EUR' }
}

export const ZERO = money(0)

export const addMoney = (a, b) => money(a.cents + b.cents)

export const percentOff = (amount, percent) => money(Math.round((amount.cents * (100 - percent)) / 100))

export const formatMoney = (amount) => `${(amount.cents / 100).toFixed(2)} ${amount.currency}`
