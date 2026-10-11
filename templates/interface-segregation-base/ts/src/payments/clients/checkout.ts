import type { Money } from '../../shop/money.ts'
import type { Payment, PaymentMethod } from '../payment.ts'
import type { PaymentGateway } from '../payment-gateway.ts'

export class Checkout {
  private readonly gateways: Readonly<Record<PaymentMethod, PaymentGateway>>

  constructor(gateways: Readonly<Record<PaymentMethod, PaymentGateway>>) {
    this.gateways = gateways
  }

  pay(method: PaymentMethod, amount: Money): Payment {
    return this.gateways[method].charge(amount)
  }
}
