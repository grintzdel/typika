import type { LegacyPayClient } from '../vendor/legacy-pay/legacy-pay-client.ts'
import { Cancellation } from './cancellation.ts'
import { Checkout } from './checkout.ts'

export type CheckoutDesk = {
  readonly checkout: Checkout
  readonly cancellation: Cancellation
}

export const openCheckout = (client: LegacyPayClient): CheckoutDesk => ({
  checkout: new Checkout(client),
  cancellation: new Cancellation(client),
})
