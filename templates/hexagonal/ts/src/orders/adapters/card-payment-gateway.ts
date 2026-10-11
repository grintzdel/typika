import type { CardProcessor } from '../../infrastructure/card-processor.ts'
import type { Money } from '../../shop/money.ts'
import type { ChargeResult, PaymentGateway } from '../ports.ts'

export class CardPaymentGateway implements PaymentGateway {
  private readonly cards: CardProcessor

  constructor(cards: CardProcessor) {
    this.cards = cards
  }

  charge(amount: Money, cardToken: string): ChargeResult {
    const charge = this.cards.charge(cardToken, amount.cents)
    return charge.approved
      ? { status: 'approved', paymentId: charge.chargeId }
      : { status: 'declined', reason: charge.reason }
  }

  refund(paymentId: string): void {
    this.cards.refund(paymentId)
  }
}
