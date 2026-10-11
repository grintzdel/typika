import { LegacyPayAdapter } from '../payments/legacy-pay-adapter.ts'
import type { LegacyPayClient } from '../vendor/legacy-pay/legacy-pay-client.ts'
import { Cancellation } from './cancellation.ts'
import { Checkout } from './checkout.ts'

export type CheckoutDesk = {
  readonly checkout: Checkout
  readonly cancellation: Cancellation
}

export const openCheckout = (client: LegacyPayClient): CheckoutDesk => {
  const payments = new LegacyPayAdapter(client)
  return { checkout: new Checkout(payments), cancellation: new Cancellation(payments) }
}
