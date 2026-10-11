import { formatMoney, type Money } from '../../shop/money.ts'
import type { Ledger } from '../../shop/ledger.ts'
import type { CardToken, Payment } from '../payment.ts'
import type { CardVault, Chargeable, RecurringPayments, Refundable } from '../capabilities.ts'

export class CardGateway implements Chargeable, Refundable, CardVault, RecurringPayments {
  private readonly ledger: Ledger
  private payments = 0

  constructor(ledger: Ledger) {
    this.ledger = ledger
  }

  charge(amount: Money): Payment {
    this.payments += 1
    this.ledger.record(`card: charged ${formatMoney(amount)}`)
    return { id: `card-${this.payments}`, method: 'card', amount }
  }

  refund(payment: Payment): void {
    this.ledger.record(`card: refunded ${formatMoney(payment.amount)} of ${payment.id}`)
  }

  saveCard(customerEmail: string, cardNumber: string): CardToken {
    const token = `tok-${cardNumber.slice(-4)}`
    this.ledger.record(`card: saved ${token} for ${customerEmail}`)
    return token
  }

  subscribe(card: CardToken, monthlyFee: Money): void {
    this.ledger.record(`card: subscribed ${card} to ${formatMoney(monthlyFee)} a month`)
  }
}
