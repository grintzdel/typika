import { money } from '../../shop/money.ts'
import type { CardToken } from '../payment.ts'
import type { RecurringPayments } from '../capabilities.ts'

const TEA_CLUB_MONTHLY_FEE = money(990)

export class TeaClub {
  private readonly payments: RecurringPayments

  constructor(payments: RecurringPayments) {
    this.payments = payments
  }

  join(card: CardToken): void {
    this.payments.subscribe(card, TEA_CLUB_MONTHLY_FEE)
  }
}
