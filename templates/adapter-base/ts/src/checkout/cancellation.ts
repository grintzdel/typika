import type { Money } from '../shop/money.ts'
import { LEGACY_PAY_CODES, type LegacyPayClient } from '../vendor/legacy-pay/legacy-pay-client.ts'

export type CancellationOutcome = { readonly status: 'refunded' } | { readonly status: 'refund-failed' }

export class Cancellation {
  private readonly client: LegacyPayClient

  constructor(client: LegacyPayClient) {
    this.client = client
  }

  cancel(paymentId: string, amount: Money): CancellationOutcome {
    const response = this.client.reversePayment(paymentId, amount.cents)
    return response.code === LEGACY_PAY_CODES.APPROVED ? { status: 'refunded' } : { status: 'refund-failed' }
  }
}
