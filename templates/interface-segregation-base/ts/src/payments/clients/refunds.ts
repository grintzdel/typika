import type { Payment, PaymentMethod } from '../payment.ts'
import type { PaymentGateway } from '../payment-gateway.ts'

export class Refunds {
  private readonly gateways: Readonly<Record<PaymentMethod, PaymentGateway>>

  constructor(gateways: Readonly<Record<PaymentMethod, PaymentGateway>>) {
    this.gateways = gateways
  }

  refund(payment: Payment): void {
    this.gateways[payment.method].refund(payment)
  }
}
