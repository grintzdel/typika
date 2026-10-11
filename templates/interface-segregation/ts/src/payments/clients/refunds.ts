import type { Refundable } from '../capabilities.ts'
import type { Payment, PaymentMethod } from '../payment.ts'

export class Refunds {
  private readonly methods: Readonly<Record<PaymentMethod, Refundable>>

  constructor(methods: Readonly<Record<PaymentMethod, Refundable>>) {
    this.methods = methods
  }

  refund(payment: Payment): void {
    this.methods[payment.method].refund(payment)
  }
}
