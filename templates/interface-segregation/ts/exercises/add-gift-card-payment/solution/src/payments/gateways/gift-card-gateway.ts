import { formatMoney, type Money } from '../../shop/money.ts'
import type { Ledger } from '../../shop/ledger.ts'
import type { Chargeable } from '../capabilities.ts'
import type { GiftCards } from '../gift-cards.ts'
import type { Payment } from '../payment.ts'

export class GiftCardGateway implements Chargeable {
  private readonly giftCards: GiftCards
  private readonly ledger: Ledger

  constructor(giftCards: GiftCards, ledger: Ledger) {
    this.giftCards = giftCards
    this.ledger = ledger
  }

  charge(amount: Money): Payment {
    const id = this.giftCards.redeem(amount)
    this.ledger.record(`gift card: redeemed ${formatMoney(amount)}`)
    return { id, method: 'gift-card', amount }
  }
}
