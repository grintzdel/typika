import { formatMoney, type Money } from '../../shop/money.ts'
import type { Ledger } from '../../shop/ledger.ts'
import type { Chargeable, Refundable } from '../capabilities.ts'
import type { Payment } from '../payment.ts'

export class BankTransferGateway implements Chargeable, Refundable {
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
}
