import type { PaymentGateway } from '../payments/payment-gateway.ts'
import type { Money } from '../shop/money.ts'

export type CancellationOutcome = { readonly status: 'refunded' } | { readonly status: 'refund-failed' }

export class Cancellation {
  private readonly payments: PaymentGateway

  constructor(payments: PaymentGateway) {
    this.payments = payments
  }

  cancel(paymentId: string, amount: Money): CancellationOutcome {
    const result = this.payments.refund(paymentId, amount)
    return result.status === 'refunded' ? { status: 'refunded' } : { status: 'refund-failed' }
  }
}
