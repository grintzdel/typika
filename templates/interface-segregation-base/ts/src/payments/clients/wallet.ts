import type { CardToken } from '../payment.ts'
import type { PaymentGateway } from '../payment-gateway.ts'

export class Wallet {
  private readonly gateway: PaymentGateway

  constructor(gateway: PaymentGateway) {
    this.gateway = gateway
  }

  saveCard(customerEmail: string, cardNumber: string): CardToken {
    return this.gateway.saveCard(customerEmail, cardNumber)
  }
}
