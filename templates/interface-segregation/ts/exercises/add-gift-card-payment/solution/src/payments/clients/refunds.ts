import type { Refundable } from '../capabilities.ts'
import type { Payment, PaymentMethod } from '../payment.ts'

export class Refunds {
  private readonly methods: Readonly<Partial<Record<PaymentMethod, Refundable>>>

  constructor(methods: Readonly<Partial<Record<PaymentMethod, Refundable>>>) {
    this.methods = methods
  }

  refund(payment: Payment): void {
    const method = this.methods[payment.method]
    if (!method) throw new Error(`Payments by ${payment.method} cannot be refunded`)
    method.refund(payment)
  }
}
