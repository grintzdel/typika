// A simulated third-party SDK: the shop cannot change it, only adapt to it.
export const LEGACY_PAY_CODES = {
  APPROVED: 0,
  DO_NOT_HONOUR: 5,
  INVALID_AMOUNT: 13,
  UNKNOWN_REFERENCE: 25,
  INSUFFICIENT_FUNDS: 51,
  EXPIRED_CARD: 54,
  SUSPECTED_FRAUD: 59,
  ISSUER_UNAVAILABLE: 91,
} as const

export type LegacyPayResponse = {
  readonly code: number
  readonly reference: string
}

const EUR = 978

const CODES_BY_CARD_TOKEN: Readonly<Record<string, number>> = {
  tok_refused: LEGACY_PAY_CODES.DO_NOT_HONOUR,
  tok_no_funds: LEGACY_PAY_CODES.INSUFFICIENT_FUNDS,
  tok_expired: LEGACY_PAY_CODES.EXPIRED_CARD,
  tok_fraud: LEGACY_PAY_CODES.SUSPECTED_FRAUD,
  tok_issuer_down: LEGACY_PAY_CODES.ISSUER_UNAVAILABLE,
}

export class LegacyPayClient {
  private readonly balances = new Map<string, number>()

  makePayment(amountCents: number, currencyCode: number, cardToken: string): LegacyPayResponse {
    if (!Number.isInteger(amountCents) || amountCents <= 0 || currencyCode !== EUR) {
      return { code: LEGACY_PAY_CODES.INVALID_AMOUNT, reference: '' }
    }
    const code = CODES_BY_CARD_TOKEN[cardToken] ?? LEGACY_PAY_CODES.APPROVED
    if (code !== LEGACY_PAY_CODES.APPROVED) return { code, reference: '' }

    const reference = `LP-${this.balances.size + 1}`
    this.balances.set(reference, amountCents)
    return { code, reference }
  }

  reversePayment(reference: string, amountCents: number): LegacyPayResponse {
    const balance = this.balances.get(reference)
    if (balance === undefined) return { code: LEGACY_PAY_CODES.UNKNOWN_REFERENCE, reference }
    if (amountCents > balance) return { code: LEGACY_PAY_CODES.INVALID_AMOUNT, reference }

    this.balances.set(reference, balance - amountCents)
    return { code: LEGACY_PAY_CODES.APPROVED, reference }
  }
}
