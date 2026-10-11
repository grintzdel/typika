export type Charge =
  | { readonly approved: true; readonly chargeId: string }
  | { readonly approved: false; readonly reason: string }

const DECLINED_CARDS: Readonly<Record<string, string>> = {
  tok_refused: 'Card refused',
  tok_no_funds: 'Insufficient funds',
}

export class CardProcessor {
  readonly refunded: string[] = []
  private charges = 0

  charge(cardToken: string, amountCents: number): Charge {
    const reason = DECLINED_CARDS[cardToken]
    if (reason !== undefined) return { approved: false, reason }
    this.charges += 1
    console.log(`card ${cardToken} charged ${amountCents} cents`)
    return { approved: true, chargeId: `ch_${this.charges}` }
  }

  refund(chargeId: string): void {
    this.refunded.push(chargeId)
  }
}
