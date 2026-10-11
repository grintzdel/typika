import { money } from '../../shop/money.ts'
import type { CardToken } from '../payment.ts'
import type { PaymentGateway } from '../payment-gateway.ts'

const TEA_CLUB_MONTHLY_FEE = money(990)

export class TeaClub {
  private readonly gateway: PaymentGateway

  constructor(gateway: PaymentGateway) {
    this.gateway = gateway
  }

  join(card: CardToken): void {
    this.gateway.subscribe(card, TEA_CLUB_MONTHLY_FEE)
  }
}
