// A simulated third-party SDK: the shop cannot change it, only adapt to it.
export type SwiftPayAmount = {
  readonly value: string
  readonly currency: string
}

export type SwiftPayChargeError = 'card_declined' | 'insufficient_funds' | 'expired_card' | 'try_again'

export type SwiftPayChargeResult =
  | { readonly ok: true; readonly id: string }
  | { readonly ok: false; readonly error: SwiftPayChargeError }

export type SwiftPayRefundResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: 'no_such_charge' | 'amount_too_large' }

const ERRORS_BY_SOURCE: Readonly<Record<string, SwiftPayChargeError>> = {
  src_declined: 'card_declined',
  src_no_funds: 'insufficient_funds',
  src_expired: 'expired_card',
  src_busy: 'try_again',
}

const centsOf = ({ value, currency }: SwiftPayAmount): number => {
  const match = /^(\d+)\.(\d{2})$/.exec(value)
  if (match === null || currency !== 'EUR') throw new Error(`SwiftPay: invalid amount ${value} ${currency}`)
  return Number(match[1]) * 100 + Number(match[2])
}

export class SwiftPayClient {
  private readonly balances = new Map<string, number>()

  createCharge(request: { readonly amount: SwiftPayAmount; readonly source: string }): SwiftPayChargeResult {
    const cents = centsOf(request.amount)
    const error = ERRORS_BY_SOURCE[request.source]
    if (error !== undefined) return { ok: false, error }

    const id = `sp_ch_${this.balances.size + 1}`
    this.balances.set(id, cents)
    return { ok: true, id }
  }

  createRefund(request: { readonly charge: string; readonly amount: SwiftPayAmount }): SwiftPayRefundResult {
    const cents = centsOf(request.amount)
    const balance = this.balances.get(request.charge)
    if (balance === undefined) return { ok: false, error: 'no_such_charge' }
    if (cents > balance) return { ok: false, error: 'amount_too_large' }

    this.balances.set(request.charge, balance - cents)
    return { ok: true }
  }
}
