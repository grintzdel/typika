import { formatMoney, type Money } from '../../shop/money.ts'
import type { Ledger } from '../../shop/ledger.ts'
import type { CardToken, Payment } from '../payment.ts'
import type { PaymentGateway } from '../payment-gateway.ts'

export class BankTransferGateway implements PaymentGateway {
  private readonly ledger: Ledger
  private payments = 0

  constructor(ledger: Ledger) {
    this.ledger = ledger
  }

  charge(amount: Money): Payment {
    this.payments += 1
    this.ledger.record(`bank transfer: requested ${formatMoney(amount)}`)
    return { id: `transfer-${this.payments}`, method: 'bank-transfer', amount }
  }

  refund(payment: Payment): void {
    this.ledger.record(`bank transfer: sent back ${formatMoney(payment.amount)} of ${payment.id}`)
  }

  saveCard(_customerEmail: string, _cardNumber: string): CardToken {
    throw new Error('Bank transfers do not store cards')
  }

  subscribe(_card: CardToken, _monthlyFee: Money): void {
    throw new Error('Bank transfers do not support subscriptions')
  }
}
